import type { DatabaseAdapter } from "@/lib/db";
import type { MessageSearchHit, NoteSearchHit, Node } from "@/lib/db/types";

export interface ConversationSearchRecord extends MessageSearchHit {
  id: string;
  nodeTitle: string;
}

export interface SearchBundle {
  conversation: ConversationSearchRecord[];
  notes: NoteSearchHit[];
}

function toNodeTitleMap(nodes: Node[]) {
  return new Map(nodes.map((node) => [node.id, node.summary ?? "未命名分支"]));
}

export class FtsSearchRepository {
  constructor(private readonly adapter: DatabaseAdapter) {}

  async searchConversation(query: string, limit = 20): Promise<ConversationSearchRecord[]> {
    const hits = await this.adapter.searchConversationMessages(query, limit);
    if (hits.length === 0) {
      return [];
    }

    const conversationIds = [...new Set(hits.map((item) => item.conversationId))];
    const nodeTitleMap = new Map<string, string>();

    for (const conversationId of conversationIds) {
      const nodes = await this.adapter.listNodesByConversation(conversationId);
      for (const [nodeId, title] of toNodeTitleMap(nodes)) {
        nodeTitleMap.set(nodeId, title);
      }
    }

    return hits.map((item) => ({
      id: `${item.conversationId}:${item.messageId}:${item.createdAt}`,
      ...item,
      nodeTitle: nodeTitleMap.get(item.nodeId) ?? "未命名分支"
    }));
  }

  async searchNotes(query: string, limit = 20) {
    return this.adapter.searchNotes(query, limit);
  }

  async searchAll(query: string, options?: { conversationLimit?: number; noteLimit?: number }) {
    const conversationLimit = options?.conversationLimit ?? 20;
    const noteLimit = options?.noteLimit ?? 20;
    const [conversation, notes] = await Promise.all([
      this.searchConversation(query, conversationLimit),
      this.searchNotes(query, noteLimit)
    ]);

    return {
      conversation,
      notes
    } satisfies SearchBundle;
  }
}
