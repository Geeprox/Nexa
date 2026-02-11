export interface SearchNode {
  id: string;
  title: string;
}

export interface SearchMessage {
  id: string;
  nodeId: string;
  role: "user" | "assistant";
  content: string;
}

export interface ConversationSearchResult {
  id: string;
  nodeId: string;
  messageId: string;
  nodeTitle: string;
  role: "user" | "assistant";
  snippet: string;
}

const SNIPPET_CONTEXT = 18;

function toSnippet(content: string, keywordIndex: number, keywordLength: number) {
  const start = Math.max(0, keywordIndex - SNIPPET_CONTEXT);
  const end = Math.min(content.length, keywordIndex + keywordLength + SNIPPET_CONTEXT);
  const raw = content.slice(start, end).trim();
  const prefix = start > 0 ? "..." : "";
  const suffix = end < content.length ? "..." : "";
  return `${prefix}${raw}${suffix}`;
}

export function searchConversationMessages(params: {
  query: string;
  nodes: SearchNode[];
  messagesByNode: Record<string, SearchMessage[]>;
  limit?: number;
}): ConversationSearchResult[] {
  const query = params.query.trim().toLowerCase();
  if (!query) {
    return [];
  }

  const nodeTitleMap = new Map(params.nodes.map((node) => [node.id, node.title]));
  const results: ConversationSearchResult[] = [];
  const limit = params.limit ?? 20;

  for (const node of params.nodes) {
    const messages = params.messagesByNode[node.id] ?? [];
    for (const message of messages) {
      const lowerContent = message.content.toLowerCase();
      const keywordIndex = lowerContent.indexOf(query);
      if (keywordIndex < 0) {
        continue;
      }

      results.push({
        id: `${message.id}:${keywordIndex}`,
        nodeId: message.nodeId,
        messageId: message.id,
        nodeTitle: nodeTitleMap.get(message.nodeId) ?? "未命名分支",
        role: message.role,
        snippet: toSnippet(message.content, keywordIndex, query.length)
      });

      if (results.length >= limit) {
        return results;
      }
    }
  }

  return results;
}
