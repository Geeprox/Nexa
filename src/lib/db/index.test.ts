import { describe, it, expect } from "vitest";
import { InMemoryAdapter } from "./index";

const conversation = {
  id: "c1",
  title: "test",
  rootNodeId: "n1",
  createdAt: new Date().toISOString()
};

describe("InMemoryAdapter", () => {
  it("stores and retrieves conversations", async () => {
    const adapter = new InMemoryAdapter();
    await adapter.saveConversation(conversation);

    const list = await adapter.listConversations();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("c1");

    const item = await adapter.getConversation("c1");
    expect(item?.title).toBe("test");
  });

  it("accepts no-op saves for non-persisted entities", async () => {
    const adapter = new InMemoryAdapter();

    await expect(
      adapter.saveNode({
        id: "n1",
        conversationId: "c1",
        parentId: null,
        summary: null,
        status: "active",
        posX: 0,
        posY: 0,
        createdAt: new Date().toISOString()
      })
    ).resolves.toBeUndefined();

    await expect(
      adapter.saveEdge({
        id: "e1",
        conversationId: "c1",
        sourceId: "n1",
        targetId: "n2"
      })
    ).resolves.toBeUndefined();

    await expect(
      adapter.saveMessage({
        id: "m1",
        nodeId: "n1",
        role: "user",
        content: "hello",
        createdAt: new Date().toISOString()
      })
    ).resolves.toBeUndefined();

    await expect(
      adapter.saveNote({
        id: "note1",
        title: "note",
        content: "content",
        sourceNodeId: null,
        sourceMessageId: null,
        createdAt: new Date().toISOString()
      })
    ).resolves.toBeUndefined();

    await expect(
      adapter.saveTag({ id: "tag1", name: "tag", createdAt: new Date().toISOString() })
    ).resolves.toBeUndefined();

    await expect(
      adapter.saveTagging({
        id: "tagging1",
        tagId: "tag1",
        entityType: "conversation",
        entityId: "c1",
        source: "manual",
        confidence: null,
        createdAt: new Date().toISOString()
      })
    ).resolves.toBeUndefined();
    await expect(adapter.deleteTagging("tagging1")).resolves.toBeUndefined();

    await expect(
      adapter.saveViewRule({
        id: "view1",
        name: "view",
        ruleJson: "{}",
        ruleNl: "all",
        createdAt: new Date().toISOString()
      })
    ).resolves.toBeUndefined();

    await expect(adapter.listJobs()).resolves.toEqual([]);
  });

  it("persists and lists node, edge and message entities", async () => {
    const adapter = new InMemoryAdapter();

    await adapter.saveNode({
      id: "n1",
      conversationId: "c1",
      parentId: null,
      summary: "root",
      status: "active",
      posX: 10,
      posY: 20,
      createdAt: new Date().toISOString()
    });
    await adapter.saveNode({
      id: "n2",
      conversationId: "c1",
      parentId: "n1",
      summary: "branch",
      status: "active",
      posX: 30,
      posY: 40,
      createdAt: new Date().toISOString()
    });
    await adapter.saveEdge({
      id: "e1",
      conversationId: "c1",
      sourceId: "n1",
      targetId: "n2"
    });
    await adapter.saveMessage({
      id: "m1",
      nodeId: "n2",
      role: "assistant",
      content: "branch content",
      createdAt: new Date().toISOString()
    });

    await expect(adapter.listNodesByConversation("c1")).resolves.toHaveLength(2);
    await expect(adapter.listEdgesByConversation("c1")).resolves.toHaveLength(1);
    await expect(adapter.listMessagesByNode("n2")).resolves.toHaveLength(1);
  });

  it("searches conversation messages and notes", async () => {
    const adapter = new InMemoryAdapter();

    await adapter.saveNode({
      id: "n1",
      conversationId: "c1",
      parentId: null,
      summary: "root",
      status: "active",
      posX: 0,
      posY: 0,
      createdAt: new Date().toISOString()
    });
    await adapter.saveMessage({
      id: "m1",
      nodeId: "n1",
      role: "assistant",
      content: "使用关键词搜索可以快速定位",
      createdAt: "2025-01-01T00:00:00.000Z"
    });
    await adapter.saveNote({
      id: "note1",
      title: "搜索说明",
      content: "笔记也应支持关键词命中",
      sourceNodeId: "n1",
      sourceMessageId: "m1",
      createdAt: "2025-01-01T00:00:01.000Z"
    });

    const messageHits = await adapter.searchConversationMessages("关键词");
    const noteHits = await adapter.searchNotes("关键词");

    expect(messageHits).toHaveLength(1);
    expect(messageHits[0].conversationId).toBe("c1");
    expect(messageHits[0].role).toBe("assistant");
    expect(noteHits).toHaveLength(1);
    expect(noteHits[0].title).toBe("搜索说明");
    expect(noteHits[0].sourceNodeId).toBe("n1");
    expect(noteHits[0].sourceMessageId).toBe("m1");
  });

  it("stores tags and filters taggings by entity", async () => {
    const adapter = new InMemoryAdapter();
    await adapter.saveTag({
      id: "tag-manual",
      name: "研究方法",
      createdAt: "2025-01-01T00:00:00.000Z"
    });
    await adapter.saveTag({
      id: "tag-auto",
      name: "对比分析",
      createdAt: "2025-01-01T00:00:01.000Z"
    });
    await adapter.saveTagging({
      id: "tagging-manual",
      tagId: "tag-manual",
      entityType: "conversation",
      entityId: "c1",
      source: "manual",
      confidence: null,
      createdAt: "2025-01-01T00:00:02.000Z"
    });
    await adapter.saveTagging({
      id: "tagging-auto",
      tagId: "tag-auto",
      entityType: "conversation",
      entityId: "c1",
      source: "auto",
      confidence: 0.9,
      createdAt: "2025-01-01T00:00:03.000Z"
    });
    await adapter.saveTagging({
      id: "tagging-note",
      tagId: "tag-auto",
      entityType: "note",
      entityId: "note-1",
      source: "auto",
      confidence: 0.7,
      createdAt: "2025-01-01T00:00:04.000Z"
    });

    const tags = await adapter.listTags();
    expect(tags.map((item) => item.name)).toEqual(["研究方法", "对比分析"]);

    const conversationTaggings = await adapter.listTaggingsByEntity("conversation", "c1");
    expect(conversationTaggings).toHaveLength(2);
    expect(conversationTaggings.map((item) => item.id)).toEqual([
      "tagging-manual",
      "tagging-auto"
    ]);

    await adapter.deleteTagging("tagging-auto");
    const afterDelete = await adapter.listTaggingsByEntity("conversation", "c1");
    expect(afterDelete.map((item) => item.id)).toEqual(["tagging-manual"]);
  });

  it("stores and lists jobs", async () => {
    const adapter = new InMemoryAdapter();
    await adapter.enqueueJob({
      id: "job1",
      type: "auto_tag_entity",
      payload: "{\"entityId\":\"c1\"}",
      status: "queued",
      createdAt: "2025-01-01T00:00:00.000Z"
    });
    await adapter.enqueueJob({
      id: "job1",
      type: "auto_tag_entity",
      payload: "{\"entityId\":\"c1\"}",
      status: "completed",
      createdAt: "2025-01-01T00:00:00.000Z"
    });

    const jobs = await adapter.listJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].status).toBe("completed");
  });
});
