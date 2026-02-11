import type { Conversation, Edge, Message, Node } from "./types";
import type { DatabaseAdapter } from "./index";

export interface PersistableGraphNode {
  id: string;
  parentId: string | null;
  title: string;
  createdAt: string;
  position: {
    x: number;
    y: number;
  };
}

export interface PersistableChatMessage {
  id: string;
  nodeId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
}

export interface PersistedConversationGraph {
  conversation: Conversation;
  nodes: Node[];
  edges: Edge[];
  messagesByNode: Record<string, Message[]>;
}

export class ConversationRepository {
  constructor(private readonly adapter: DatabaseAdapter) {}

  async saveConversationGraph(params: {
    conversation: Conversation;
    nodes: PersistableGraphNode[];
    messagesByNode: Record<string, PersistableChatMessage[]>;
  }) {
    const { conversation, nodes, messagesByNode } = params;
    await this.adapter.saveConversation(conversation);

    for (const node of nodes) {
      await this.adapter.saveNode({
        id: node.id,
        conversationId: conversation.id,
        parentId: node.parentId,
        summary: node.title,
        status: "active",
        posX: node.position.x,
        posY: node.position.y,
        createdAt: node.createdAt
      });

      if (node.parentId) {
        await this.adapter.saveEdge({
          id: `${node.parentId}-${node.id}`,
          conversationId: conversation.id,
          sourceId: node.parentId,
          targetId: node.id
        });
      }

      const messages = messagesByNode[node.id] ?? [];
      for (const message of messages) {
        await this.adapter.saveMessage({
          id: message.id,
          nodeId: node.id,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt ?? new Date().toISOString()
        });
      }
    }
  }

  async loadConversationGraph(conversationId: string): Promise<PersistedConversationGraph | null> {
    const conversation = await this.adapter.getConversation(conversationId);
    if (!conversation) {
      return null;
    }

    const nodes = await this.adapter.listNodesByConversation(conversationId);
    const edges = await this.adapter.listEdgesByConversation(conversationId);
    const messagesByNode: Record<string, Message[]> = {};

    for (const node of nodes) {
      messagesByNode[node.id] = await this.adapter.listMessagesByNode(node.id);
    }

    return {
      conversation,
      nodes,
      edges,
      messagesByNode
    };
  }
}
