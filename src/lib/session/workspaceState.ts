import { logError, logInfo, logWarn } from "@/lib/logging/logger";
import {
  CONVERSATION_SNAPSHOT_KEY,
  ConversationSnapshot,
  StorageLike,
  loadConversationSnapshot,
  normalizeConversationSnapshot
} from "./conversationSnapshot";

export const WORKSPACE_STATE_KEY = "nexa.v2.workspace.state";

export interface WorkspaceConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  snapshot: ConversationSnapshot;
}

export interface WorkspaceNote {
  id: string;
  title: string;
  content: string;
  sourceConversationId: string;
  sourceNodeId: string;
  sourceMessageId: string;
  createdAt: string;
}

export interface ModelProviderSettings {
  providerUrl: string;
  apiKey: string;
}

export interface WorkspaceState {
  version: 2;
  conversations: WorkspaceConversation[];
  activeConversationId: string;
  notes: WorkspaceNote[];
  modelProvider: ModelProviderSettings;
}

export const DEFAULT_MODEL_PROVIDER_SETTINGS: ModelProviderSettings = {
  providerUrl: "https://api.openai.com/v1",
  apiKey: ""
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStorage(storage?: StorageLike): StorageLike | null {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function toConversationTitle(snapshot: ConversationSnapshot) {
  const firstUserMessage = Object.values(snapshot.messagesByNode)
    .flat()
    .find((message) => message.role === "user")?.content;
  if (!firstUserMessage) {
    return "New chat";
  }

  const compact = firstUserMessage.trim().replace(/\s+/g, " ");
  if (!compact) {
    return "New chat";
  }

  return compact.length <= 26 ? compact : `${compact.slice(0, 26)}...`;
}

function normalizeModelProviderSettings(raw: unknown): ModelProviderSettings {
  if (!isRecord(raw)) {
    return DEFAULT_MODEL_PROVIDER_SETTINGS;
  }

  const providerUrl =
    typeof raw.providerUrl === "string" && raw.providerUrl.trim().length > 0
      ? raw.providerUrl.trim()
      : DEFAULT_MODEL_PROVIDER_SETTINGS.providerUrl;
  const apiKey = typeof raw.apiKey === "string" ? raw.apiKey : "";

  return {
    providerUrl,
    apiKey
  };
}

function normalizeNote(raw: unknown): WorkspaceNote | null {
  if (!isRecord(raw)) {
    return null;
  }

  if (
    typeof raw.id !== "string" ||
    typeof raw.title !== "string" ||
    typeof raw.content !== "string" ||
    typeof raw.sourceConversationId !== "string" ||
    typeof raw.sourceNodeId !== "string" ||
    typeof raw.sourceMessageId !== "string" ||
    typeof raw.createdAt !== "string"
  ) {
    return null;
  }

  const title = raw.title.trim();
  const content = raw.content.trim();
  if (!title || !content) {
    return null;
  }

  return {
    id: raw.id,
    title,
    content,
    sourceConversationId: raw.sourceConversationId,
    sourceNodeId: raw.sourceNodeId,
    sourceMessageId: raw.sourceMessageId,
    createdAt: raw.createdAt
  };
}

function normalizeConversation(raw: unknown): WorkspaceConversation | null {
  if (!isRecord(raw)) {
    return null;
  }

  if (
    typeof raw.id !== "string" ||
    typeof raw.title !== "string" ||
    typeof raw.createdAt !== "string" ||
    typeof raw.updatedAt !== "string"
  ) {
    return null;
  }

  const snapshot = normalizeConversationSnapshot(raw.snapshot);
  if (!snapshot) {
    return null;
  }

  const title = raw.title.trim() || toConversationTitle(snapshot);
  return {
    id: raw.id,
    title,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    snapshot
  };
}

export function normalizeWorkspaceState(raw: unknown): WorkspaceState | null {
  if (!isRecord(raw) || raw.version !== 2 || !Array.isArray(raw.conversations)) {
    return null;
  }

  const conversations = raw.conversations
    .map(normalizeConversation)
    .filter((item): item is WorkspaceConversation => item !== null);
  if (conversations.length === 0) {
    return null;
  }

  const activeConversationId =
    typeof raw.activeConversationId === "string" &&
    conversations.some((conversation) => conversation.id === raw.activeConversationId)
      ? raw.activeConversationId
      : conversations[0].id;

  const notes = Array.isArray(raw.notes)
    ? raw.notes.map(normalizeNote).filter((item): item is WorkspaceNote => item !== null)
    : [];
  const modelProvider = normalizeModelProviderSettings(raw.modelProvider);

  return {
    version: 2,
    conversations,
    activeConversationId,
    notes,
    modelProvider
  };
}

export function createWorkspaceFromLegacySnapshot(snapshot: ConversationSnapshot): WorkspaceState {
  const now = new Date().toISOString();
  const conversationId = `conv-${crypto.randomUUID().slice(0, 8)}`;
  return {
    version: 2,
    conversations: [
      {
        id: conversationId,
        title: toConversationTitle(snapshot),
        createdAt: now,
        updatedAt: now,
        snapshot
      }
    ],
    activeConversationId: conversationId,
    notes: [],
    modelProvider: DEFAULT_MODEL_PROVIDER_SETTINGS
  };
}

function withActiveConversation(state: WorkspaceState): WorkspaceState {
  return {
    ...state,
    activeConversationId:
      state.activeConversationId && state.conversations.some((item) => item.id === state.activeConversationId)
        ? state.activeConversationId
        : state.conversations[0].id
  };
}

function tryMigrateFromLegacy(target: StorageLike): WorkspaceState | null {
  const legacySnapshot = loadConversationSnapshot(target);
  if (!legacySnapshot) {
    const legacyRaw = target.getItem(CONVERSATION_SNAPSHOT_KEY);
    if (legacyRaw) {
      logWarn("workspaceState", "Invalid legacy snapshot found. Removing dirty data.");
      target.removeItem(CONVERSATION_SNAPSHOT_KEY);
    }
    return null;
  }

  const migrated = withActiveConversation(createWorkspaceFromLegacySnapshot(legacySnapshot));
  if (saveWorkspaceState(migrated, target)) {
    target.removeItem(CONVERSATION_SNAPSHOT_KEY);
    logInfo("workspaceState", "Legacy snapshot migrated to workspace state.");
  }

  return migrated;
}

export function loadWorkspaceState(storage?: StorageLike): WorkspaceState | null {
  const target = toStorage(storage);
  if (!target) {
    return null;
  }

  const raw = target.getItem(WORKSPACE_STATE_KEY);
  if (raw) {
    try {
      const normalized = normalizeWorkspaceState(JSON.parse(raw));
      if (!normalized) {
        logWarn("workspaceState", "Workspace state schema invalid. Removing dirty data.");
        target.removeItem(WORKSPACE_STATE_KEY);
        return tryMigrateFromLegacy(target);
      }
      return withActiveConversation(normalized);
    } catch (error) {
      logError("workspaceState", error, {
        message: "Failed to parse workspace state. Removing dirty data."
      });
      target.removeItem(WORKSPACE_STATE_KEY);
      return tryMigrateFromLegacy(target);
    }
  }

  return tryMigrateFromLegacy(target);
}

export function saveWorkspaceState(state: WorkspaceState, storage?: StorageLike): boolean {
  const target = toStorage(storage);
  if (!target) {
    return false;
  }

  const normalized = normalizeWorkspaceState(state);
  if (!normalized) {
    logWarn("workspaceState", "Refused to persist invalid workspace state.");
    return false;
  }

  try {
    target.setItem(WORKSPACE_STATE_KEY, JSON.stringify(withActiveConversation(normalized)));
    return true;
  } catch (error) {
    logError("workspaceState", error, {
      message: "Failed to persist workspace state."
    });
    return false;
  }
}

export function clearWorkspaceState(storage?: StorageLike) {
  const target = toStorage(storage);
  if (!target) {
    return;
  }

  try {
    target.removeItem(WORKSPACE_STATE_KEY);
    target.removeItem(CONVERSATION_SNAPSHOT_KEY);
  } catch (error) {
    logError("workspaceState", error, {
      message: "Failed to clear workspace state."
    });
  }
}
