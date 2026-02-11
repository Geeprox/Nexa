import { describe, expect, it } from "vitest";
import {
  CONVERSATION_SNAPSHOT_KEY,
  ConversationSnapshot,
  loadConversationSnapshot,
  normalizeConversationSnapshot,
  saveConversationSnapshot,
  StorageLike
} from "./conversationSnapshot";

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    }
  };
}

const baseSnapshot: ConversationSnapshot = {
  version: 1,
  nodes: [
    {
      id: "root",
      parentId: null,
      title: "起点问题",
      createdAt: "2025-01-01T00:00:00.000Z",
      position: { x: 40, y: 140 }
    }
  ],
  messagesByNode: {
    root: [
      {
        id: "m1",
        nodeId: "root",
        role: "user",
        content: "hello"
      }
    ]
  },
  activeNodeId: "root",
  conversationTags: [
    {
      name: "研究方法",
      source: "manual",
      confidence: null
    }
  ],
  dismissedAutoTags: ["对比分析"]
};

describe("conversation snapshot persistence", () => {
  it("saves and loads snapshot", () => {
    const storage = createMemoryStorage();
    const saved = saveConversationSnapshot(baseSnapshot, storage);

    expect(saved).toBe(true);
    const loaded = loadConversationSnapshot(storage);

    expect(loaded).toEqual(baseSnapshot);
  });

  it("returns null for invalid payload", () => {
    const normalized = normalizeConversationSnapshot({ version: 2 });
    expect(normalized).toBeNull();
  });

  it("falls back to first node when active node is missing", () => {
    const normalized = normalizeConversationSnapshot({
      ...baseSnapshot,
      activeNodeId: "missing"
    });

    expect(normalized?.activeNodeId).toBe("root");
  });

  it("fills tag defaults when old snapshot payload has no tagging fields", () => {
    const normalized = normalizeConversationSnapshot({
      version: 1,
      nodes: baseSnapshot.nodes,
      messagesByNode: baseSnapshot.messagesByNode,
      activeNodeId: "root"
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.conversationTags).toEqual([]);
    expect(normalized?.dismissedAutoTags).toEqual([]);
  });

  it("loads null on malformed JSON", () => {
    const storage = createMemoryStorage();
    storage.setItem(CONVERSATION_SNAPSHOT_KEY, "{invalid-json}");

    expect(loadConversationSnapshot(storage)).toBeNull();
  });

  it("drops message buckets for non-existing nodes", () => {
    const normalized = normalizeConversationSnapshot({
      ...baseSnapshot,
      messagesByNode: {
        root: baseSnapshot.messagesByNode.root,
        ghost: [
          {
            id: "m-ghost",
            nodeId: "ghost",
            role: "assistant",
            content: "ghost"
          }
        ]
      }
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.messagesByNode.ghost).toBeUndefined();
    expect(normalized?.messagesByNode.root).toHaveLength(1);
  });
});
