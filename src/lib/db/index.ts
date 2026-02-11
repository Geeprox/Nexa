import type {
  Conversation,
  Node,
  Edge,
  Message,
  MessageSearchHit,
  EntityType,
  Note,
  NoteSearchHit,
  Tag,
  Tagging,
  ViewRule,
  Job
} from "./types";

export interface DatabaseAdapter {
  listConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | null>;
  listNodesByConversation(conversationId: string): Promise<Node[]>;
  listEdgesByConversation(conversationId: string): Promise<Edge[]>;
  listMessagesByNode(nodeId: string): Promise<Message[]>;
  searchConversationMessages(query: string, limit?: number): Promise<MessageSearchHit[]>;
  searchNotes(query: string, limit?: number): Promise<NoteSearchHit[]>;
  listTags(): Promise<Tag[]>;
  listTaggingsByEntity(entityType: EntityType, entityId: string): Promise<Tagging[]>;
  saveConversation(conversation: Conversation): Promise<void>;
  saveNode(node: Node): Promise<void>;
  saveEdge(edge: Edge): Promise<void>;
  saveMessage(message: Message): Promise<void>;
  saveNote(note: Note): Promise<void>;
  saveTag(tag: Tag): Promise<void>;
  saveTagging(tagging: Tagging): Promise<void>;
  deleteTagging(taggingId: string): Promise<void>;
  listJobs(): Promise<Job[]>;
  saveViewRule(viewRule: ViewRule): Promise<void>;
  enqueueJob(job: Job): Promise<void>;
}

export class InMemoryAdapter implements DatabaseAdapter {
  private conversations: Conversation[] = [];
  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private messages: Message[] = [];
  private notes: Note[] = [];
  private tags: Tag[] = [];
  private taggings: Tagging[] = [];
  private jobs: Job[] = [];

  private toSnippet(content: string, query: string) {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const keywordIndex = lowerContent.indexOf(lowerQuery);
    if (keywordIndex < 0) {
      return content.slice(0, 40);
    }

    const start = Math.max(0, keywordIndex - 16);
    const end = Math.min(content.length, keywordIndex + query.length + 16);
    const prefix = start > 0 ? "..." : "";
    const suffix = end < content.length ? "..." : "";
    return `${prefix}${content.slice(start, end).trim()}${suffix}`;
  }

  async listConversations() {
    return this.conversations;
  }

  async getConversation(id: string) {
    return this.conversations.find((item) => item.id === id) ?? null;
  }

  async listNodesByConversation(conversationId: string) {
    return this.nodes.filter((item) => item.conversationId === conversationId);
  }

  async listEdgesByConversation(conversationId: string) {
    return this.edges.filter((item) => item.conversationId === conversationId);
  }

  async listMessagesByNode(nodeId: string) {
    return this.messages.filter((item) => item.nodeId === nodeId);
  }

  async searchConversationMessages(query: string, limit = 20) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    const nodeMap = new Map(this.nodes.map((node) => [node.id, node]));
    const hits: MessageSearchHit[] = [];

    for (const message of this.messages) {
      if (!message.content.toLowerCase().includes(normalized)) {
        continue;
      }

      const node = nodeMap.get(message.nodeId);
      if (!node) {
        continue;
      }

      hits.push({
        conversationId: node.conversationId,
        nodeId: message.nodeId,
        messageId: message.id,
        role: message.role,
        snippet: this.toSnippet(message.content, normalized),
        createdAt: message.createdAt
      });

      if (hits.length >= limit) {
        break;
      }
    }

    return hits;
  }

  async searchNotes(query: string, limit = 20) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    const hits: NoteSearchHit[] = [];
    for (const note of this.notes) {
      const searchable = `${note.title} ${note.content}`.toLowerCase();
      if (!searchable.includes(normalized)) {
        continue;
      }

      hits.push({
        noteId: note.id,
        title: note.title,
        snippet: this.toSnippet(note.content, normalized),
        sourceNodeId: note.sourceNodeId,
        sourceMessageId: note.sourceMessageId,
        createdAt: note.createdAt
      });

      if (hits.length >= limit) {
        break;
      }
    }

    return hits;
  }

  async listTags() {
    return this.tags;
  }

  async listTaggingsByEntity(entityType: EntityType, entityId: string) {
    return this.taggings.filter(
      (item) => item.entityType === entityType && item.entityId === entityId
    );
  }

  async listJobs() {
    return this.jobs;
  }

  async saveConversation(conversation: Conversation) {
    this.conversations = this.conversations.filter((item) => item.id !== conversation.id);
    this.conversations.push(conversation);
  }

  async saveNode(node: Node) {
    this.nodes = this.nodes.filter((item) => item.id !== node.id);
    this.nodes.push(node);
  }

  async saveEdge(edge: Edge) {
    this.edges = this.edges.filter((item) => item.id !== edge.id);
    this.edges.push(edge);
  }

  async saveMessage(message: Message) {
    this.messages = this.messages.filter((item) => item.id !== message.id);
    this.messages.push(message);
  }

  async saveNote(note: Note) {
    this.notes = this.notes.filter((item) => item.id !== note.id);
    this.notes.push(note);
  }

  async saveTag(tag: Tag) {
    this.tags = this.tags.filter((item) => item.id !== tag.id);
    this.tags.push(tag);
  }

  async saveTagging(tagging: Tagging) {
    this.taggings = this.taggings.filter((item) => item.id !== tagging.id);
    this.taggings.push(tagging);
  }

  async deleteTagging(taggingId: string) {
    this.taggings = this.taggings.filter((item) => item.id !== taggingId);
  }

  async saveViewRule() {
    return;
  }

  async enqueueJob(job: Job) {
    this.jobs = this.jobs.filter((item) => item.id !== job.id);
    this.jobs.push(job);
  }
}
