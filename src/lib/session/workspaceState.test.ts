import { describe, expect, it } from "vitest";
import { CONVERSATION_SNAPSHOT_KEY, ConversationSnapshot } from "./conversationSnapshot";
import {
  WORKSPACE_STATE_KEY,
  WorkspaceState,
  loadWorkspaceState,
  normalizeWorkspaceState,
  saveWorkspaceState
} from "./workspaceState";

function createMemoryStorage(initial?: Record<string, string>) {
  const bucket = new Map(Object.entries(initial ?? {}));
  return {
    getItem(key: string) {
      return bucket.has(key) ? bucket.get(key) ?? null : null;
    },
    setItem(key: string, value: string) {
      bucket.set(key, value);
    },
    removeItem(key: string) {
      bucket.delete(key);
    }
  };
}

function createLegacySnapshot(): ConversationSnapshot {
  return {
    version: 1,
    nodes: [
      {
        id: "root",
        parentId: null,
        title: "起点问题",
        createdAt: "2026-02-12T09:00:00.000Z",
        position: { x: 10, y: 20 }
      }
    ],
    messagesByNode: {
      root: [
        {
          id: "m-1",
          nodeId: "root",
          role: "user",
          content: "如何用 LLM 做文献对比？"
        }
      ]
    },
    activeNodeId: "root",
    conversationTags: [],
    dismissedAutoTags: []
  };
}

describe("workspaceState", () => {
  it("normalizes and persists valid workspace state", () => {
    const state: WorkspaceState = {
      version: 2,
      conversations: [
        {
          id: "conv-1",
          title: "Chat 1",
          createdAt: "2026-02-12T09:00:00.000Z",
          updatedAt: "2026-02-12T09:00:00.000Z",
          snapshot: createLegacySnapshot()
        }
      ],
      activeConversationId: "conv-1",
      notes: [],
      modelProvider: {
        providerUrl: "https://api.openai.com/v1",
        apiKey: ""
      }
    };

    const storage = createMemoryStorage();
    expect(saveWorkspaceState(state, storage)).toBe(true);

    const loaded = loadWorkspaceState(storage);
    expect(loaded?.conversations).toHaveLength(1);
    expect(loaded?.activeConversationId).toBe("conv-1");
  });

  it("migrates legacy conversation snapshot to workspace state", () => {
    const legacy = createLegacySnapshot();
    const storage = createMemoryStorage({
      [CONVERSATION_SNAPSHOT_KEY]: JSON.stringify(legacy)
    });

    const loaded = loadWorkspaceState(storage);
    expect(loaded).not.toBeNull();
    expect(loaded?.conversations).toHaveLength(1);
    expect(loaded?.conversations[0].snapshot.nodes[0].id).toBe("root");
    expect(storage.getItem(WORKSPACE_STATE_KEY)).not.toBeNull();
    expect(storage.getItem(CONVERSATION_SNAPSHOT_KEY)).toBeNull();
  });

  it("cleans dirty persisted data when schema is invalid", () => {
    const storage = createMemoryStorage({
      [WORKSPACE_STATE_KEY]: JSON.stringify({ version: 2, conversations: [] })
    });

    const loaded = loadWorkspaceState(storage);
    expect(loaded).toBeNull();
    expect(storage.getItem(WORKSPACE_STATE_KEY)).toBeNull();
  });

  it("returns null on malformed workspace state", () => {
    expect(normalizeWorkspaceState({ version: 2, conversations: [] })).toBeNull();
  });
});
