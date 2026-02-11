import { describe, expect, it } from "vitest";
import { SQLITE_SCHEMA_V1, SqliteAdapter, SqliteExecutor } from "./sqlite";

class MockExecutor implements SqliteExecutor {
  runCalls: Array<{ sql: string; params: unknown[] | undefined }> = [];
  allCalls: Array<{ sql: string; params: unknown[] | undefined }> = [];
  private responses = new Map<string, unknown[]>();

  queueResponse(sql: string, rows: unknown[]) {
    this.responses.set(sql, rows);
  }

  async run(sql: string, params?: unknown[]) {
    this.runCalls.push({ sql, params });
  }

  async all<T>(sql: string, params?: unknown[]) {
    this.allCalls.push({ sql, params });
    return (this.responses.get(sql) ?? []) as T[];
  }
}

describe("SqliteAdapter", () => {
  it("runs schema migration statements", async () => {
    const executor = new MockExecutor();
    const adapter = new SqliteAdapter(executor);

    await adapter.migrate();

    expect(executor.runCalls).toHaveLength(SQLITE_SCHEMA_V1.length);
    expect(executor.runCalls.map((item) => item.sql)).toEqual(SQLITE_SCHEMA_V1);
  });

  it("maps conversation, node, edge and message rows", async () => {
    const executor = new MockExecutor();
    const adapter = new SqliteAdapter(executor);

    const listConversationsSql =
      "SELECT id, title, root_node_id, created_at FROM conversations ORDER BY created_at ASC;";
    executor.queueResponse(listConversationsSql, [
      {
        id: "c1",
        title: "test",
        root_node_id: "n1",
        created_at: "2025-01-01T00:00:00.000Z"
      }
    ]);
    const listNodesSql =
      "SELECT id, conversation_id, parent_id, summary, status, pos_x, pos_y, created_at FROM nodes WHERE conversation_id = ? ORDER BY created_at ASC;";
    executor.queueResponse(listNodesSql, [
      {
        id: "n1",
        conversation_id: "c1",
        parent_id: null,
        summary: "root",
        status: "active",
        pos_x: 10,
        pos_y: 20,
        created_at: "2025-01-01T00:00:00.000Z"
      }
    ]);
    const listEdgesSql =
      "SELECT id, conversation_id, source_id, target_id FROM edges WHERE conversation_id = ?;";
    executor.queueResponse(listEdgesSql, [
      {
        id: "e1",
        conversation_id: "c1",
        source_id: "n1",
        target_id: "n2"
      }
    ]);
    const listMessagesSql =
      "SELECT id, node_id, role, content, created_at FROM messages WHERE node_id = ? ORDER BY created_at ASC;";
    executor.queueResponse(listMessagesSql, [
      {
        id: "m1",
        node_id: "n1",
        role: "assistant",
        content: "hello",
        created_at: "2025-01-01T00:00:00.000Z"
      }
    ]);

    const conversations = await adapter.listConversations();
    const nodes = await adapter.listNodesByConversation("c1");
    const edges = await adapter.listEdgesByConversation("c1");
    const messages = await adapter.listMessagesByNode("n1");

    expect(conversations[0].rootNodeId).toBe("n1");
    expect(nodes[0].conversationId).toBe("c1");
    expect(edges[0].sourceId).toBe("n1");
    expect(messages[0].nodeId).toBe("n1");
  });

  it("maps conversation and note FTS search rows", async () => {
    const executor = new MockExecutor();
    const adapter = new SqliteAdapter(executor);

    const searchMessagesSql =
      "SELECT n.conversation_id, m.node_id, m.id AS message_id, m.role, snippet(message_fts, 2, '[', ']', '...', 12) AS snippet, m.created_at FROM message_fts JOIN messages m ON m.id = message_fts.message_id JOIN nodes n ON n.id = m.node_id WHERE message_fts MATCH ? ORDER BY bm25(message_fts), m.created_at ASC LIMIT ?;";
    executor.queueResponse(searchMessagesSql, [
      {
        conversation_id: "c1",
        node_id: "n1",
        message_id: "m1",
        role: "assistant",
        snippet: "使用[关键词]搜索",
        created_at: "2025-01-01T00:00:00.000Z"
      }
    ]);
    const searchNotesSql =
      "SELECT n.id AS note_id, n.title, snippet(note_fts, 2, '[', ']', '...', 12) AS snippet, n.source_node_id, n.source_message_id, n.created_at FROM note_fts JOIN notes n ON n.id = note_fts.note_id WHERE note_fts MATCH ? ORDER BY bm25(note_fts), n.created_at ASC LIMIT ?;";
    executor.queueResponse(searchNotesSql, [
      {
        note_id: "note1",
        title: "搜索说明",
        snippet: "笔记也应支持[关键词]命中",
        source_node_id: "n1",
        source_message_id: "m1",
        created_at: "2025-01-01T00:00:01.000Z"
      }
    ]);

    const messageHits = await adapter.searchConversationMessages("关键词", 10);
    const noteHits = await adapter.searchNotes("关键词", 10);

    expect(messageHits).toEqual([
      {
        conversationId: "c1",
        nodeId: "n1",
        messageId: "m1",
        role: "assistant",
        snippet: "使用[关键词]搜索",
        createdAt: "2025-01-01T00:00:00.000Z"
      }
    ]);
    expect(noteHits).toEqual([
      {
        noteId: "note1",
        title: "搜索说明",
        snippet: "笔记也应支持[关键词]命中",
        sourceNodeId: "n1",
        sourceMessageId: "m1",
        createdAt: "2025-01-01T00:00:01.000Z"
      }
    ]);
  });

  it("maps tags and taggings rows", async () => {
    const executor = new MockExecutor();
    const adapter = new SqliteAdapter(executor);

    const listTagsSql = "SELECT id, name, created_at FROM tags ORDER BY created_at ASC;";
    executor.queueResponse(listTagsSql, [
      {
        id: "tag-1",
        name: "研究方法",
        created_at: "2025-01-01T00:00:00.000Z"
      }
    ]);
    const listTaggingsSql =
      "SELECT id, tag_id, entity_type, entity_id, source, confidence, created_at FROM taggings WHERE entity_type = ? AND entity_id = ? ORDER BY created_at ASC;";
    executor.queueResponse(listTaggingsSql, [
      {
        id: "tagging-1",
        tag_id: "tag-1",
        entity_type: "conversation",
        entity_id: "c1",
        source: "auto",
        confidence: 0.82,
        created_at: "2025-01-01T00:00:01.000Z"
      }
    ]);

    const tags = await adapter.listTags();
    const taggings = await adapter.listTaggingsByEntity("conversation", "c1");

    expect(tags).toEqual([
      {
        id: "tag-1",
        name: "研究方法",
        createdAt: "2025-01-01T00:00:00.000Z"
      }
    ]);
    expect(taggings).toEqual([
      {
        id: "tagging-1",
        tagId: "tag-1",
        entityType: "conversation",
        entityId: "c1",
        source: "auto",
        confidence: 0.82,
        createdAt: "2025-01-01T00:00:01.000Z"
      }
    ]);
  });

  it("maps jobs rows", async () => {
    const executor = new MockExecutor();
    const adapter = new SqliteAdapter(executor);
    const listJobsSql = "SELECT id, type, payload, status, created_at FROM jobs ORDER BY created_at ASC;";
    executor.queueResponse(listJobsSql, [
      {
        id: "job1",
        type: "auto_tag_entity",
        payload: "{\"entityId\":\"c1\"}",
        status: "queued",
        created_at: "2025-01-01T00:00:00.000Z"
      }
    ]);

    const jobs = await adapter.listJobs();
    expect(jobs).toEqual([
      {
        id: "job1",
        type: "auto_tag_entity",
        payload: "{\"entityId\":\"c1\"}",
        status: "queued",
        createdAt: "2025-01-01T00:00:00.000Z"
      }
    ]);
  });

  it("writes upsert statements for graph entities", async () => {
    const executor = new MockExecutor();
    const adapter = new SqliteAdapter(executor);

    await adapter.saveConversation({
      id: "c1",
      title: "conversation",
      rootNodeId: "n1",
      createdAt: "2025-01-01T00:00:00.000Z"
    });
    await adapter.saveNode({
      id: "n1",
      conversationId: "c1",
      parentId: null,
      summary: "root",
      status: "active",
      posX: 10,
      posY: 20,
      createdAt: "2025-01-01T00:00:00.000Z"
    });
    await adapter.saveEdge({
      id: "e1",
      conversationId: "c1",
      sourceId: "n1",
      targetId: "n2"
    });
    await adapter.saveMessage({
      id: "m1",
      nodeId: "n1",
      role: "assistant",
      content: "hello",
      createdAt: "2025-01-01T00:00:00.000Z"
    });
    await adapter.saveNote({
      id: "note1",
      title: "note",
      content: "content",
      sourceNodeId: "n1",
      sourceMessageId: "m1",
      createdAt: "2025-01-01T00:00:01.000Z"
    });
    await adapter.saveTag({
      id: "tag-1",
      name: "研究方法",
      createdAt: "2025-01-01T00:00:02.000Z"
    });
    await adapter.saveTagging({
      id: "tagging-1",
      tagId: "tag-1",
      entityType: "conversation",
      entityId: "c1",
      source: "manual",
      confidence: null,
      createdAt: "2025-01-01T00:00:03.000Z"
    });
    await adapter.deleteTagging("tagging-1");
    await adapter.enqueueJob({
      id: "job1",
      type: "auto_tag_entity",
      payload: "{\"entityId\":\"c1\"}",
      status: "queued",
      createdAt: "2025-01-01T00:00:04.000Z"
    });

    expect(executor.runCalls.map((item) => item.sql)).toEqual([
      "INSERT OR REPLACE INTO conversations (id, title, root_node_id, created_at) VALUES (?, ?, ?, ?);",
      "INSERT OR REPLACE INTO nodes (id, conversation_id, parent_id, summary, status, pos_x, pos_y, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
      "INSERT OR REPLACE INTO edges (id, conversation_id, source_id, target_id) VALUES (?, ?, ?, ?);",
      "INSERT OR REPLACE INTO messages (id, node_id, role, content, created_at) VALUES (?, ?, ?, ?, ?);",
      "INSERT OR REPLACE INTO notes (id, title, content, source_node_id, source_message_id, created_at) VALUES (?, ?, ?, ?, ?, ?);",
      "INSERT OR REPLACE INTO tags (id, name, created_at) VALUES (?, ?, ?);",
      "INSERT OR REPLACE INTO taggings (id, tag_id, entity_type, entity_id, source, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);",
      "DELETE FROM taggings WHERE id = ?;",
      "INSERT OR REPLACE INTO jobs (id, type, payload, status, created_at) VALUES (?, ?, ?, ?, ?);"
    ]);
    expect(executor.runCalls[0].params).toEqual([
      "c1",
      "conversation",
      "n1",
      "2025-01-01T00:00:00.000Z"
    ]);
  });
});
