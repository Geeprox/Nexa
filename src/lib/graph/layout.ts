export interface LayoutPosition {
  x: number;
  y: number;
}

export interface LayoutNode {
  id: string;
  position: LayoutPosition;
}

export interface LayoutMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const GRAPH_NODE_WIDTH = 560;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function estimateGraphNodeHeight(messages: LayoutMessage[] = []) {
  const user = messages.find((message) => message.role === "user")?.content ?? "";
  const assistant = [...messages].reverse().find((message) => message.role === "assistant")?.content ?? "";
  const total = user.length + assistant.length;
  const estimatedLines = Math.ceil(total / 120);

  // Base block height covers chrome + minimal Q/A layout.
  const base = 220;
  const perLine = 18;
  return clamp(base + estimatedLines * perLine, 220, 720);
}

export function rectsOverlap(a: LayoutRect, b: LayoutRect, padding = 0) {
  return (
    a.x < b.x + b.width + padding &&
    a.x + a.width + padding > b.x &&
    a.y < b.y + b.height + padding &&
    a.y + a.height + padding > b.y
  );
}

export function resolveNonOverlappingPosition({
  nodes,
  messagesByNode,
  candidateNodeId,
  candidatePosition,
  padding = 36,
  maxIterations = 48
}: {
  nodes: LayoutNode[];
  messagesByNode: Record<string, LayoutMessage[]>;
  candidateNodeId: string;
  candidatePosition: LayoutPosition;
  padding?: number;
  maxIterations?: number;
}): LayoutPosition {
  const candidateHeight = estimateGraphNodeHeight(messagesByNode[candidateNodeId] ?? []);
  const buildRect = (position: LayoutPosition, height: number): LayoutRect => ({
    x: position.x,
    y: position.y,
    width: GRAPH_NODE_WIDTH,
    height
  });

  let next = { ...candidatePosition };

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const rect = buildRect(next, candidateHeight);

    const collision = nodes.find((node) => {
      if (node.id === candidateNodeId) {
        return false;
      }
      const height = estimateGraphNodeHeight(messagesByNode[node.id] ?? []);
      return rectsOverlap(rect, buildRect(node.position, height), padding);
    });

    if (!collision) {
      break;
    }

    const collisionHeight = estimateGraphNodeHeight(messagesByNode[collision.id] ?? []);
    next = {
      x: next.x,
      y: collision.position.y + collisionHeight + padding
    };
  }

  return next;
}
