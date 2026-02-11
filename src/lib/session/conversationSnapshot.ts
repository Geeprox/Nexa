export const CONVERSATION_SNAPSHOT_KEY = "nexa.v1.conversation.snapshot";

export interface PersistedMessage {
  id: string;
  nodeId: string;
  role: "user" | "assistant";
  content: string;
}

export interface PersistedNode {
  id: string;
  parentId: string | null;
  title: string;
  createdAt: string;
  position: {
    x: number;
    y: number;
  };
}

export interface PersistedConversationTag {
  name: string;
  source: "manual" | "auto";
  confidence: number | null;
}

export interface ConversationSnapshot {
  version: 1;
  nodes: PersistedNode[];
  messagesByNode: Record<string, PersistedMessage[]>;
  activeNodeId: string;
  conversationTags: PersistedConversationTag[];
  dismissedAutoTags: string[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNode(value: unknown): value is PersistedNode {
  if (!isRecord(value)) {
    return false;
  }

  const position = value.position;
  return (
    typeof value.id === "string" &&
    (typeof value.parentId === "string" || value.parentId === null) &&
    typeof value.title === "string" &&
    typeof value.createdAt === "string" &&
    isRecord(position) &&
    typeof position.x === "number" &&
    typeof position.y === "number"
  );
}

function isMessage(value: unknown): value is PersistedMessage {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.nodeId === "string" &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string"
  );
}

function isConversationTag(value: unknown): value is PersistedConversationTag {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.name === "string" &&
    (value.source === "manual" || value.source === "auto") &&
    (typeof value.confidence === "number" || value.confidence === null)
  );
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

export function normalizeConversationSnapshot(raw: unknown): ConversationSnapshot | null {
  if (!isRecord(raw)) {
    return null;
  }

  if (raw.version !== 1 || !Array.isArray(raw.nodes) || !isRecord(raw.messagesByNode)) {
    return null;
  }

  const nodes = raw.nodes.filter(isNode);
  if (nodes.length === 0) {
    return null;
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const normalizedMessages: Record<string, PersistedMessage[]> = {};

  for (const [nodeId, messages] of Object.entries(raw.messagesByNode)) {
    if (!nodeIds.has(nodeId) || !Array.isArray(messages)) {
      continue;
    }

    normalizedMessages[nodeId] = messages.filter(isMessage).map((message) => ({
      ...message,
      nodeId
    }));
  }

  for (const node of nodes) {
    if (!normalizedMessages[node.id]) {
      normalizedMessages[node.id] = [];
    }
  }

  const conversationTags = Array.isArray(raw.conversationTags)
    ? raw.conversationTags
        .filter(isConversationTag)
        .map((tag) => ({
          name: tag.name.trim(),
          source: tag.source,
          confidence: tag.source === "manual" ? null : tag.confidence
        }))
        .filter((tag) => tag.name.length > 0)
    : [];
  const dismissedAutoTags = Array.isArray(raw.dismissedAutoTags)
    ? [...new Set(
        raw.dismissedAutoTags
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim().toLowerCase())
          .filter((item) => item.length > 0)
      )]
    : [];

  const activeNodeId =
    typeof raw.activeNodeId === "string" && nodeIds.has(raw.activeNodeId)
      ? raw.activeNodeId
      : nodes[0].id;

  return {
    version: 1,
    nodes,
    messagesByNode: normalizedMessages,
    activeNodeId,
    conversationTags,
    dismissedAutoTags
  };
}

export function loadConversationSnapshot(storage?: StorageLike): ConversationSnapshot | null {
  const target = toStorage(storage);
  if (!target) {
    return null;
  }

  try {
    const raw = target.getItem(CONVERSATION_SNAPSHOT_KEY);
    if (!raw) {
      return null;
    }

    return normalizeConversationSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveConversationSnapshot(
  snapshot: ConversationSnapshot,
  storage?: StorageLike
): boolean {
  const target = toStorage(storage);
  if (!target) {
    return false;
  }

  const normalized = normalizeConversationSnapshot(snapshot);
  if (!normalized) {
    return false;
  }

  try {
    target.setItem(CONVERSATION_SNAPSHOT_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}
