"use client";

import {
  Background,
  ConnectionLineType,
  Edge,
  Handle,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  useNodesState
} from "@xyflow/react";
import { GitBranch, Move } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";

export interface GraphNode {
  id: string;
  parentId: string | null;
  title: string;
  createdAt: string;
  position: {
    x: number;
    y: number;
  };
}

interface GraphPaneProps {
  nodes: GraphNode[];
  activeNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onMoveNode: (nodeId: string, position: { x: number; y: number }) => void;
}

interface GraphCardData extends Record<string, unknown> {
  nodeId: string;
  title: string;
  status: "根" | "分支";
  isActive: boolean;
  onActivate: (nodeId: string) => void;
}

type GraphFlowNode = Node<GraphCardData, "card">;

function GraphCardNode({ id, data }: NodeProps<GraphFlowNode>) {
  return (
    <button
      type="button"
      data-testid={`graph-node-${id}`}
      aria-label={`聚焦分支 ${data.title}`}
      className={`min-w-[180px] rounded-xl border px-3 py-3 text-left text-sm shadow-sm transition-colors duration-150 motion-reduce:transition-none ${
        data.isActive
          ? "border-foreground/60 bg-muted/80 ring-2 ring-ring/30"
          : "border-border bg-card hover:border-foreground/25 hover:bg-muted/40"
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
      aria-current={data.isActive ? "true" : undefined}
      onClick={() => data.onActivate(data.nodeId)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        data.onActivate(data.nodeId);
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-muted-foreground/40"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{data.title}</span>
        <span className="text-xs text-muted-foreground">{data.status}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">点击聚焦到该分支</p>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-muted-foreground/40"
      />
    </button>
  );
}

const nodeTypes = {
  card: GraphCardNode
};

export function GraphPane({
  nodes,
  activeNodeId,
  onSelectNode,
  onMoveNode
}: GraphPaneProps) {
  const nextFlowNodes = useMemo<GraphFlowNode[]>(() => {
    return nodes.map((node) => ({
      id: node.id,
      type: "card",
      position: node.position,
      draggable: true,
      data: {
        nodeId: node.id,
        title: node.title,
        status: node.parentId ? "分支" : "根",
        isActive: node.id === activeNodeId,
        onActivate: onSelectNode
      }
    }));
  }, [activeNodeId, nodes, onSelectNode]);

  const edges = useMemo<Edge[]>(() => {
    return nodes
      .filter((node) => node.parentId)
      .map((node) => ({
        id: `${node.parentId}-${node.id}`,
        source: node.parentId as string,
        target: node.id,
        animated: false,
        type: "smoothstep",
        style: {
          stroke:
            node.id === activeNodeId || node.parentId === activeNodeId
              ? "hsl(var(--graph-edge-active))"
              : "hsl(var(--graph-edge))",
          strokeWidth: node.id === activeNodeId || node.parentId === activeNodeId ? 1.8 : 1.2
        }
      }));
  }, [activeNodeId, nodes]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nextFlowNodes);

  useEffect(() => {
    setFlowNodes((current) => {
      const currentMap = new Map(current.map((node) => [node.id, node]));
      return nextFlowNodes.map((node) => {
        const previous = currentMap.get(node.id);
        if (!previous) {
          return node;
        }
        return {
          ...node,
          position: previous.position
        };
      });
    });
  }, [nextFlowNodes, setFlowNodes]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: GraphFlowNode) => {
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: GraphFlowNode) => {
      onMoveNode(node.id, node.position);
    },
    [onMoveNode]
  );

  const handleCanvasKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        const currentIndex = nodes.findIndex((node) => node.id === activeNodeId);
        const nextIndex = currentIndex >= 0 ? Math.min(nodes.length - 1, currentIndex + 1) : 0;
        onSelectNode(nodes[nextIndex]?.id ?? activeNodeId);
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        const currentIndex = nodes.findIndex((node) => node.id === activeNodeId);
        const previousIndex = currentIndex >= 0 ? Math.max(0, currentIndex - 1) : 0;
        onSelectNode(nodes[previousIndex]?.id ?? activeNodeId);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        onSelectNode(nodes[0]?.id ?? activeNodeId);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        onSelectNode(nodes[nodes.length - 1]?.id ?? activeNodeId);
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        const target = event.target as HTMLElement;
        const testId = target.closest<HTMLElement>("[data-testid^='graph-node-']")?.dataset.testid;
        if (!testId) {
          return;
        }

        const nodeId = testId.replace("graph-node-", "");
        event.preventDefault();
        onSelectNode(nodeId);
      }
    },
    [activeNodeId, nodes, onSelectNode]
  );

  return (
    <div className="flex h-full flex-col bg-background/70">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <GitBranch className="h-4 w-4" />
          对话图谱
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-muted-foreground">
          <Move className="h-4 w-4" />
          拖拽 / 缩放
        </span>
      </div>

      <div className="flex-1 overflow-hidden p-3">
        <div
          className="h-full rounded-xl border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          data-testid="graph-canvas"
          tabIndex={0}
          aria-label="对话图谱画布"
          onKeyDownCapture={handleCanvasKeyDown}
        >
          <ReactFlow
            fitView
            nodes={flowNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            minZoom={0.4}
            maxZoom={1.6}
            connectionLineType={ConnectionLineType.SmoothStep}
            onNodesChange={onNodesChange}
            onNodeClick={handleNodeClick}
            onNodeDragStop={handleNodeDragStop}
          >
            <Background gap={20} size={1} color="hsl(var(--graph-grid))" />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
