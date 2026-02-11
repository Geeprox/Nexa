import type {
  Conversation,
  EntityType,
  Edge,
  Message,
  MessageSearchHit,
  Note,
  NoteSearchHit,
  Node,
  Tag,
  Tagging,
  ViewRule,
  Job
} from "./types";
import type { DatabaseAdapter } from "./index";

export interface SqliteExecutor {
  run(sql: string, params?: unknown[]): Promise<void>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

export const SQLITE_SCHEMA_V1: string[] = [
  "PRAGMA foreign_keys = ON;",
  "CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT NOT NULL, root_node_id TEXT NOT NULL, created_at TEXT NOT NULL);",
  "CREATE TABLE IF NOT EXISTS nodes (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, parent_id TEXT, summary TEXT, status TEXT NOT NULL, pos_x REAL NOT NULL, pos_y REAL NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE, FOREIGN KEY (parent_id) REFERENCES nodes(id) ON DELETE SET NULL);",
  "CREATE INDEX IF NOT EXISTS idx_nodes_conversation ON nodes(conversation_id);",
  "CREATE TABLE IF NOT EXISTS edges (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, source_id TEXT NOT NULL, target_id TEXT NOT NULL, FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE, FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE, FOREIGN KEY (target_id) REFERENCES nodes(id) ON DELETE CASCADE);",
  "CREATE INDEX IF NOT EXISTS idx_edges_conversation ON edges(conversation_id);",
  "CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, node_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE);",
  "CREATE INDEX IF NOT EXISTS idx_messages_node ON messages(node_id);",
  "CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, source_node_id TEXT, source_message_id TEXT, created_at TEXT NOT NULL, FOREIGN KEY (source_node_id) REFERENCES nodes(id) ON DELETE SET NULL, FOREIGN KEY (source_message_id) REFERENCES messages(id) ON DELETE SET NULL);",
  "CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);",
  "CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, created_at TEXT NOT NULL);",
  "CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);",
  "CREATE TABLE IF NOT EXISTS taggings (id TEXT PRIMARY KEY, tag_id TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, source TEXT NOT NULL, confidence REAL, created_at TEXT NOT NULL, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE);",
  "CREATE INDEX IF NOT EXISTS idx_taggings_entity ON taggings(entity_type, entity_id, created_at);",
  "CREATE INDEX IF NOT EXISTS idx_taggings_tag ON taggings(tag_id);",
  "CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, type TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);",
  "CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);",
  "CREATE VIRTUAL TABLE IF NOT EXISTS message_fts USING fts5(message_id UNINDEXED, node_id UNINDEXED, content);",
  "CREATE VIRTUAL TABLE IF NOT EXISTS note_fts USING fts5(note_id UNINDEXED, title, content);",
  "CREATE TRIGGER IF NOT EXISTS trg_messages_ai AFTER INSERT ON messages BEGIN INSERT INTO message_fts(rowid, message_id, node_id, content) VALUES (new.rowid, new.id, new.node_id, new.content); END;",
  "CREATE TRIGGER IF NOT EXISTS trg_messages_ad AFTER DELETE ON messages BEGIN INSERT INTO message_fts(message_fts, rowid, message_id, node_id, content) VALUES ('delete', old.rowid, old.id, old.node_id, old.content); END;",
  "CREATE TRIGGER IF NOT EXISTS trg_messages_au AFTER UPDATE ON messages BEGIN INSERT INTO message_fts(message_fts, rowid, message_id, node_id, content) VALUES ('delete', old.rowid, old.id, old.node_id, old.content); INSERT INTO message_fts(rowid, message_id, node_id, content) VALUES (new.rowid, new.id, new.node_id, new.content); END;",
  "CREATE TRIGGER IF NOT EXISTS trg_notes_ai AFTER INSERT ON notes BEGIN INSERT INTO note_fts(rowid, note_id, title, content) VALUES (new.rowid, new.id, new.title, new.content); END;",
  "CREATE TRIGGER IF NOT EXISTS trg_notes_ad AFTER DELETE ON notes BEGIN INSERT INTO note_fts(note_fts, rowid, note_id, title, content) VALUES ('delete', old.rowid, old.id, old.title, old.content); END;",
  "CREATE TRIGGER IF NOT EXISTS trg_notes_au AFTER UPDATE ON notes BEGIN INSERT INTO note_fts(note_fts, rowid, note_id, title, content) VALUES ('delete', old.rowid, old.id, old.title, old.content); INSERT INTO note_fts(rowid, note_id, title, content) VALUES (new.rowid, new.id, new.title, new.content); END;"
];

interface ConversationRow {
  id: string;
  title: string;
  root_node_id: string;
  created_at: string;
}

interface NodeRow {
  id: string;
  conversation_id: string;
  parent_id: string | null;
  summary: string | null;
  status: "active" | "archived";
  pos_x: number;
  pos_y: number;
  created_at: string;
}

interface EdgeRow {
  id: string;
  conversation_id: string;
  source_id: string;
  target_id: string;
}

interface MessageRow {
  id: string;
  node_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

interface MessageSearchRow {
  conversation_id: string;
  node_id: string;
  message_id: string;
  role: "user" | "assistant" | "system";
  snippet: string;
  created_at: string;
}

interface NoteSearchRow {
  note_id: string;
  title: string;
  snippet: string;
  source_node_id: string | null;
  source_message_id: string | null;
  created_at: string;
}

interface TagRow {
  id: string;
  name: string;
  created_at: string;
}

interface TaggingRow {
  id: string;
  tag_id: string;
  entity_type: EntityType;
  entity_id: string;
  source: "manual" | "auto";
  confidence: number | null;
  created_at: string;
}

interface JobRow {
  id: string;
  type: string;
  payload: string;
  status: "queued" | "running" | "failed" | "completed";
  created_at: string;
}

function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    rootNodeId: row.root_node_id,
    createdAt: row.created_at
  };
}

function toNode(row: NodeRow): Node {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    parentId: row.parent_id,
    summary: row.summary,
    status: row.status,
    posX: row.pos_x,
    posY: row.pos_y,
    createdAt: row.created_at
  };
}

function toEdge(row: EdgeRow): Edge {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    sourceId: row.source_id,
    targetId: row.target_id
  };
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    nodeId: row.node_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at
  };
}

function toTag(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at
  };
}

function toTagging(row: TaggingRow): Tagging {
  return {
    id: row.id,
    tagId: row.tag_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    source: row.source,
    confidence: row.confidence,
    createdAt: row.created_at
  };
}

function toJob(row: JobRow): Job {
  return {
    id: row.id,
    type: row.type,
    payload: row.payload,
    status: row.status,
    createdAt: row.created_at
  };
}

export class SqliteAdapter implements DatabaseAdapter {
  constructor(private readonly executor: SqliteExecutor) {}

  async migrate() {
    for (const statement of SQLITE_SCHEMA_V1) {
      await this.executor.run(statement);
    }
  }

  async listConversations() {
    const rows = await this.executor.all<ConversationRow>(
      "SELECT id, title, root_node_id, created_at FROM conversations ORDER BY created_at ASC;"
    );
    return rows.map(toConversation);
  }

  async getConversation(id: string) {
    const rows = await this.executor.all<ConversationRow>(
      "SELECT id, title, root_node_id, created_at FROM conversations WHERE id = ? LIMIT 1;",
      [id]
    );
    return rows[0] ? toConversation(rows[0]) : null;
  }

  async listNodesByConversation(conversationId: string) {
    const rows = await this.executor.all<NodeRow>(
      "SELECT id, conversation_id, parent_id, summary, status, pos_x, pos_y, created_at FROM nodes WHERE conversation_id = ? ORDER BY created_at ASC;",
      [conversationId]
    );
    return rows.map(toNode);
  }

  async listEdgesByConversation(conversationId: string) {
    const rows = await this.executor.all<EdgeRow>(
      "SELECT id, conversation_id, source_id, target_id FROM edges WHERE conversation_id = ?;",
      [conversationId]
    );
    return rows.map(toEdge);
  }

  async listMessagesByNode(nodeId: string) {
    const rows = await this.executor.all<MessageRow>(
      "SELECT id, node_id, role, content, created_at FROM messages WHERE node_id = ? ORDER BY created_at ASC;",
      [nodeId]
    );
    return rows.map(toMessage);
  }

  async searchConversationMessages(query: string, limit = 20) {
    const normalized = query.trim();
    if (!normalized) {
      return [];
    }

    const rows = await this.executor.all<MessageSearchRow>(
      "SELECT n.conversation_id, m.node_id, m.id AS message_id, m.role, snippet(message_fts, 2, '[', ']', '...', 12) AS snippet, m.created_at FROM message_fts JOIN messages m ON m.id = message_fts.message_id JOIN nodes n ON n.id = m.node_id WHERE message_fts MATCH ? ORDER BY bm25(message_fts), m.created_at ASC LIMIT ?;",
      [normalized, limit]
    );

    return rows.map<MessageSearchHit>((row) => ({
      conversationId: row.conversation_id,
      nodeId: row.node_id,
      messageId: row.message_id,
      role: row.role,
      snippet: row.snippet,
      createdAt: row.created_at
    }));
  }

  async searchNotes(query: string, limit = 20) {
    const normalized = query.trim();
    if (!normalized) {
      return [];
    }

    const rows = await this.executor.all<NoteSearchRow>(
      "SELECT n.id AS note_id, n.title, snippet(note_fts, 2, '[', ']', '...', 12) AS snippet, n.source_node_id, n.source_message_id, n.created_at FROM note_fts JOIN notes n ON n.id = note_fts.note_id WHERE note_fts MATCH ? ORDER BY bm25(note_fts), n.created_at ASC LIMIT ?;",
      [normalized, limit]
    );

    return rows.map<NoteSearchHit>((row) => ({
      noteId: row.note_id,
      title: row.title,
      snippet: row.snippet,
      sourceNodeId: row.source_node_id,
      sourceMessageId: row.source_message_id,
      createdAt: row.created_at
    }));
  }

  async listTags() {
    const rows = await this.executor.all<TagRow>(
      "SELECT id, name, created_at FROM tags ORDER BY created_at ASC;"
    );
    return rows.map(toTag);
  }

  async listTaggingsByEntity(entityType: EntityType, entityId: string) {
    const rows = await this.executor.all<TaggingRow>(
      "SELECT id, tag_id, entity_type, entity_id, source, confidence, created_at FROM taggings WHERE entity_type = ? AND entity_id = ? ORDER BY created_at ASC;",
      [entityType, entityId]
    );
    return rows.map(toTagging);
  }

  async listJobs() {
    const rows = await this.executor.all<JobRow>(
      "SELECT id, type, payload, status, created_at FROM jobs ORDER BY created_at ASC;"
    );
    return rows.map(toJob);
  }

  async saveConversation(conversation: Conversation) {
    await this.executor.run(
      "INSERT OR REPLACE INTO conversations (id, title, root_node_id, created_at) VALUES (?, ?, ?, ?);",
      [conversation.id, conversation.title, conversation.rootNodeId, conversation.createdAt]
    );
  }

  async saveNode(node: Node) {
    await this.executor.run(
      "INSERT OR REPLACE INTO nodes (id, conversation_id, parent_id, summary, status, pos_x, pos_y, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
      [
        node.id,
        node.conversationId,
        node.parentId,
        node.summary,
        node.status,
        node.posX,
        node.posY,
        node.createdAt
      ]
    );
  }

  async saveEdge(edge: Edge) {
    await this.executor.run(
      "INSERT OR REPLACE INTO edges (id, conversation_id, source_id, target_id) VALUES (?, ?, ?, ?);",
      [edge.id, edge.conversationId, edge.sourceId, edge.targetId]
    );
  }

  async saveMessage(message: Message) {
    await this.executor.run(
      "INSERT OR REPLACE INTO messages (id, node_id, role, content, created_at) VALUES (?, ?, ?, ?, ?);",
      [message.id, message.nodeId, message.role, message.content, message.createdAt]
    );
  }

  async saveNote(note: Note) {
    await this.executor.run(
      "INSERT OR REPLACE INTO notes (id, title, content, source_node_id, source_message_id, created_at) VALUES (?, ?, ?, ?, ?, ?);",
      [
        note.id,
        note.title,
        note.content,
        note.sourceNodeId,
        note.sourceMessageId,
        note.createdAt
      ]
    );
  }

  async saveTag(tag: Tag) {
    await this.executor.run(
      "INSERT OR REPLACE INTO tags (id, name, created_at) VALUES (?, ?, ?);",
      [tag.id, tag.name, tag.createdAt]
    );
  }

  async saveTagging(tagging: Tagging) {
    await this.executor.run(
      "INSERT OR REPLACE INTO taggings (id, tag_id, entity_type, entity_id, source, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);",
      [
        tagging.id,
        tagging.tagId,
        tagging.entityType,
        tagging.entityId,
        tagging.source,
        tagging.confidence,
        tagging.createdAt
      ]
    );
  }

  async deleteTagging(taggingId: string) {
    await this.executor.run("DELETE FROM taggings WHERE id = ?;", [taggingId]);
  }

  async saveViewRule(viewRule: ViewRule) {
    void viewRule;
    return;
  }

  async enqueueJob(job: Job) {
    await this.executor.run(
      "INSERT OR REPLACE INTO jobs (id, type, payload, status, created_at) VALUES (?, ?, ?, ?, ?);",
      [job.id, job.type, job.payload, job.status, job.createdAt]
    );
  }
}
