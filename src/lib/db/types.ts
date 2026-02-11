export type EntityType = "conversation" | "note";
export type TagSource = "manual" | "auto";

export interface Conversation {
  id: string;
  title: string;
  rootNodeId: string;
  createdAt: string;
}

export interface Node {
  id: string;
  conversationId: string;
  parentId: string | null;
  summary: string | null;
  status: "active" | "archived";
  posX: number;
  posY: number;
  createdAt: string;
}

export interface Edge {
  id: string;
  conversationId: string;
  sourceId: string;
  targetId: string;
}

export interface Message {
  id: string;
  nodeId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface MessageSearchHit {
  conversationId: string;
  nodeId: string;
  messageId: string;
  role: "user" | "assistant" | "system";
  snippet: string;
  createdAt: string;
}

export interface Selection {
  id: string;
  messageId: string;
  rangeStart: number;
  rangeEnd: number;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  sourceNodeId: string | null;
  sourceMessageId: string | null;
  createdAt: string;
}

export interface NoteSearchHit {
  noteId: string;
  title: string;
  snippet: string;
  sourceNodeId: string | null;
  sourceMessageId: string | null;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
}

export interface Tagging {
  id: string;
  tagId: string;
  entityType: EntityType;
  entityId: string;
  source: TagSource;
  confidence: number | null;
  createdAt: string;
}

export interface ViewRule {
  id: string;
  name: string;
  ruleJson: string;
  ruleNl: string;
  createdAt: string;
}

export interface Job {
  id: string;
  type: string;
  payload: string;
  status: "queued" | "running" | "failed" | "completed";
  createdAt: string;
}
