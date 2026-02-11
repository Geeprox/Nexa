import { describe, expect, it } from "vitest";
import { InMemoryAdapter } from "./index";
import { ConversationRepository } from "./conversationRepository";

describe("ConversationRepository", () => {
  it("saves and loads conversation graph from adapter", async () => {
    const repository = new ConversationRepository(new InMemoryAdapter());

    await repository.saveConversationGraph({
      conversation: {
        id: "c1",
        title: "研究会话",
        rootNodeId: "root",
        createdAt: "2025-01-01T00:00:00.000Z"
      },
      nodes: [
        {
          id: "root",
          parentId: null,
          title: "起点问题",
          createdAt: "2025-01-01T00:00:00.000Z",
          position: { x: 40, y: 120 }
        },
        {
          id: "node-a",
          parentId: "root",
          title: "方法分支",
          createdAt: "2025-01-01T00:01:00.000Z",
          position: { x: 320, y: 200 }
        }
      ],
      messagesByNode: {
        root: [
          {
            id: "m-root",
            nodeId: "root",
            role: "user",
            content: "root"
          }
        ],
        "node-a": [
          {
            id: "m-a",
            nodeId: "node-a",
            role: "assistant",
            content: "branch",
            createdAt: "2025-01-01T00:01:00.000Z"
          }
        ]
      }
    });

    const loaded = await repository.loadConversationGraph("c1");

    expect(loaded).not.toBeNull();
    expect(loaded?.nodes).toHaveLength(2);
    expect(loaded?.edges).toHaveLength(1);
    expect(loaded?.messagesByNode["node-a"]?.[0]?.content).toBe("branch");
  });

  it("returns null for unknown conversation id", async () => {
    const repository = new ConversationRepository(new InMemoryAdapter());

    const loaded = await repository.loadConversationGraph("missing");
    expect(loaded).toBeNull();
  });
});
