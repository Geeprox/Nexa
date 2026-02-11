import { describe, expect, it } from "vitest";
import { InMemoryAdapter } from "@/lib/db";
import { FtsSearchRepository } from "./ftsSearchRepository";

describe("FtsSearchRepository", () => {
  it("maps node title for conversation hits", async () => {
    const adapter = new InMemoryAdapter();
    const repository = new FtsSearchRepository(adapter);

    await adapter.saveNode({
      id: "n1",
      conversationId: "c1",
      parentId: null,
      summary: "方法分支",
      status: "active",
      posX: 0,
      posY: 0,
      createdAt: "2025-01-01T00:00:00.000Z"
    });
    await adapter.saveMessage({
      id: "m1",
      nodeId: "n1",
      role: "assistant",
      content: "这里介绍关键词搜索",
      createdAt: "2025-01-01T00:00:01.000Z"
    });

    const result = await repository.searchConversation("关键词");
    expect(result).toHaveLength(1);
    expect(result[0].nodeTitle).toBe("方法分支");
    expect(result[0].messageId).toBe("m1");
  });

  it("returns combined search bundle", async () => {
    const adapter = new InMemoryAdapter();
    const repository = new FtsSearchRepository(adapter);

    await adapter.saveNode({
      id: "n1",
      conversationId: "c1",
      parentId: null,
      summary: "根节点",
      status: "active",
      posX: 0,
      posY: 0,
      createdAt: "2025-01-01T00:00:00.000Z"
    });
    await adapter.saveMessage({
      id: "m1",
      nodeId: "n1",
      role: "assistant",
      content: "搜索路径包含会话",
      createdAt: "2025-01-01T00:00:01.000Z"
    });
    await adapter.saveNote({
      id: "note1",
      title: "搜索说明",
      content: "搜索路径包含笔记",
      sourceNodeId: "n1",
      sourceMessageId: "m1",
      createdAt: "2025-01-01T00:00:02.000Z"
    });

    const result = await repository.searchAll("搜索");
    expect(result.conversation).toHaveLength(1);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].noteId).toBe("note1");
  });
});
