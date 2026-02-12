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
import { GitBranchPlus, NotebookPen } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BranchCreatePayload, ChatMessage, NoteCreatePayload } from "@/components/chat/ChatPane";
import { Button } from "@/components/ui/button";

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
  messagesByNode: Record<string, ChatMessage[]>;
  activeNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onMoveNode: (nodeId: string, position: { x: number; y: number }) => void;
  onCreateBranch: (payload: BranchCreatePayload) => void;
  onCreateNote: (payload: NoteCreatePayload) => void;
}

interface GraphCardData extends Record<string, unknown> {
  nodeId: string;
  title: string;
  status: "Root" | "Branch";
  isActive: boolean;
  messageCount: number;
  questionText: string;
  questionMessageId: string;
  questionQuotePreview: string | null;
  answerText: string;
  answerMessageId: string | null;
  answerStreaming: boolean;
  createdAt: string;
  onActivate: (nodeId: string) => void;
  onCreateBranch: (payload: BranchCreatePayload) => void;
  onCreateNote: (payload: NoteCreatePayload) => void;
}

type GraphFlowNode = Node<GraphCardData, "card">;

function GraphCardNode({ id, data }: NodeProps<GraphFlowNode>) {
  const branchSourceMessageId = data.answerMessageId ?? data.questionMessageId;
  const branchSourceNodeId = data.nodeId;
  const noteSourceMessageId = data.answerMessageId ?? data.questionMessageId;
  const noteContent = data.answerMessageId ? data.answerText : data.questionText;

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`graph-node-${id}`}
      aria-label={`聚焦分支 ${data.title}`}
      className={`min-w-[360px] max-w-[560px] rounded-2xl border px-4 py-3 text-left text-sm shadow-sm transition-colors duration-150 motion-reduce:transition-none ${
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

      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{data.title}</span>
        <span className="shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {data.status}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div
          className="rounded-xl border bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-secondary-foreground"
          data-graph-message-id={data.questionMessageId}
          data-graph-node-id={data.nodeId}
          data-graph-role="user"
        >
          {data.questionQuotePreview ? (
            <div className="mb-2 rounded-lg border bg-background/50 px-2 py-1.5 text-[11px] text-muted-foreground">
              <p className="whitespace-pre-wrap">↳ “{data.questionQuotePreview}”</p>
            </div>
          ) : null}
          <p className="whitespace-pre-wrap">{data.questionText}</p>
        </div>

        <div
          className="rounded-xl border bg-card px-3 py-2 text-xs leading-relaxed text-foreground"
          data-graph-message-id={data.answerMessageId ?? data.questionMessageId}
          data-graph-node-id={data.nodeId}
          data-graph-role="assistant"
        >
          <p className="whitespace-pre-wrap">{data.answerText}</p>
          {data.answerStreaming ? <p className="mt-1 text-[11px] text-muted-foreground">Streaming...</p> : null}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{`${data.messageCount} messages`}</span>
        <span>{data.createdAt}</span>
      </div>

      <div className="mt-1 flex items-center gap-1 text-muted-foreground">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Create Branch"
          className="h-6 w-6"
          onClick={(event) => {
            event.stopPropagation();
            data.onCreateBranch({
              mode: "clone",
              sourceMessageId: branchSourceMessageId,
              sourceNodeId: branchSourceNodeId
            });
          }}
        >
          <GitBranchPlus className="h-3.5 w-3.5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Take Note"
          className="h-6 w-6"
          onClick={(event) => {
            event.stopPropagation();
            data.onCreateNote({
              mode: "message",
              sourceMessageId: noteSourceMessageId,
              sourceNodeId: branchSourceNodeId,
              content: noteContent
            });
          }}
        >
          <NotebookPen className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-muted-foreground/40"
      />
    </div>
  );
}

const nodeTypes = {
  card: GraphCardNode
};

interface SelectionActionState {
  x: number;
  y: number;
  sourceMessageId: string;
  sourceNodeId: string;
  selectedText: string;
}

function toQuotePreview(message: ChatMessage | undefined) {
  const source = message?.quotePreview ?? message?.quotedText;
  if (!source) {
    return null;
  }

  const compact = source.trim().replace(/\s+/g, " ");
  if (!compact) {
    return null;
  }

  return compact.length <= 120 ? compact : `${compact.slice(0, 120)}...`;
}

export function GraphPane({
  nodes,
  messagesByNode,
  activeNodeId,
  onSelectNode,
  onMoveNode,
  onCreateBranch,
  onCreateNote
}: GraphPaneProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [selectionAction, setSelectionAction] = useState<SelectionActionState | null>(null);

  const nextFlowNodes = useMemo<GraphFlowNode[]>(() => {
    return nodes.map((node) => {
      const nodeMessages = messagesByNode[node.id] ?? [];
      const userMessage = nodeMessages.find((message) => message.role === "user");
      const assistantVariants = userMessage
        ? nodeMessages.filter(
            (message) => message.role === "assistant" && message.replyToMessageId === userMessage.id
          )
        : nodeMessages.filter((message) => message.role === "assistant");
      const assistantMessage = assistantVariants.at(-1);

      return {
        id: node.id,
        type: "card",
        position: node.position,
        draggable: true,
        data: {
          nodeId: node.id,
          title: node.title,
          status: node.parentId ? "Branch" : "Root",
          isActive: node.id === activeNodeId,
          messageCount: nodeMessages.length,
          questionText: userMessage?.content ?? "(No question yet)",
          questionMessageId: userMessage?.id ?? `${node.id}-question-fallback`,
          questionQuotePreview: toQuotePreview(userMessage),
          answerText: assistantMessage?.content ?? "(Awaiting assistant response)",
          answerMessageId: assistantMessage?.id ?? null,
          answerStreaming: assistantMessage?.isStreaming ?? false,
          createdAt: new Date(node.createdAt).toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
          }),
          onActivate: onSelectNode,
          onCreateBranch,
          onCreateNote
        }
      };
    });
  }, [activeNodeId, messagesByNode, nodes, onCreateBranch, onCreateNote, onSelectNode]);

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

  const hideSelectionAction = useCallback(() => {
    setSelectionAction(null);
  }, []);

  const findMessageElement = useCallback((selection: Selection, range: Range) => {
    const selector = "[data-graph-message-id][data-graph-node-id]";
    const resolveFromNode = (node: Node | null) => {
      if (!node) {
        return null;
      }

      const element = node instanceof Element ? node : node.parentElement;
      return element?.closest<HTMLElement>(selector) ?? null;
    };

    const directCandidates = [
      resolveFromNode(range.startContainer),
      resolveFromNode(range.endContainer),
      resolveFromNode(range.commonAncestorContainer),
      resolveFromNode(selection.anchorNode),
      resolveFromNode(selection.focusNode)
    ];

    for (const candidate of directCandidates) {
      if (candidate && canvasRef.current?.contains(candidate)) {
        return candidate;
      }
    }

    if (!canvasRef.current) {
      return null;
    }

    const messageElements = canvasRef.current.querySelectorAll<HTMLElement>(selector);
    for (const messageElement of messageElements) {
      try {
        if (range.intersectsNode(messageElement)) {
          return messageElement;
        }
      } catch {
        // Ignore detached ranges from rapid drag operations.
      }
    }

    return null;
  }, []);

  const updateSelectionAction = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      hideSelectionAction();
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      hideSelectionAction();
      return;
    }

    const range = selection.getRangeAt(0);
    const messageElement = findMessageElement(selection, range);
    if (!messageElement) {
      hideSelectionAction();
      return;
    }

    const sourceMessageId = messageElement.dataset.graphMessageId;
    const sourceNodeId = messageElement.dataset.graphNodeId;
    if (!sourceMessageId || !sourceNodeId) {
      hideSelectionAction();
      return;
    }

    const rect = range.getBoundingClientRect();
    const fallbackRect = messageElement.getBoundingClientRect();
    const left = rect.width > 0 ? rect.left + rect.width / 2 : fallbackRect.left + Math.min(120, fallbackRect.width / 2);
    const top = rect.top > 0 ? rect.top : fallbackRect.top;

    setSelectionAction({
      x: left,
      y: Math.max(14, top - 10),
      sourceMessageId,
      sourceNodeId,
      selectedText
    });
  }, [findMessageElement, hideSelectionAction]);

  const handleBranchFromSelection = useCallback(() => {
    if (!selectionAction) {
      return;
    }

    onCreateBranch({
      mode: "selection",
      sourceMessageId: selectionAction.sourceMessageId,
      sourceNodeId: selectionAction.sourceNodeId,
      selectedText: selectionAction.selectedText
    });

    window.getSelection()?.removeAllRanges();
    hideSelectionAction();
  }, [hideSelectionAction, onCreateBranch, selectionAction]);

  const handleNoteFromSelection = useCallback(() => {
    if (!selectionAction) {
      return;
    }

    onCreateNote({
      mode: "selection",
      sourceMessageId: selectionAction.sourceMessageId,
      sourceNodeId: selectionAction.sourceNodeId,
      content: selectionAction.selectedText
    });

    window.getSelection()?.removeAllRanges();
    hideSelectionAction();
  }, [hideSelectionAction, onCreateNote, selectionAction]);

  useEffect(() => {
    if (!selectionAction) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleBranchFromSelection();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        hideSelectionAction();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleBranchFromSelection, hideSelectionAction, selectionAction]);

  return (
    <div
      ref={canvasRef}
      className="h-full overflow-hidden p-3"
      onMouseUp={updateSelectionAction}
      onPointerUp={updateSelectionAction}
      onWheel={hideSelectionAction}
    >
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
          minZoom={0.3}
          maxZoom={1.6}
          connectionLineType={ConnectionLineType.SmoothStep}
          onNodesChange={onNodesChange}
          onNodeClick={handleNodeClick}
          onNodeDragStop={handleNodeDragStop}
          onPaneClick={hideSelectionAction}
        >
          <Background gap={20} size={1} color="hsl(var(--graph-grid))" />
        </ReactFlow>
      </div>

      {selectionAction ? (
        <div
          data-branch-fab="true"
          className="fixed z-20 -translate-x-1/2 -translate-y-full rounded-full border bg-card p-1 shadow-sm"
          style={{ left: selectionAction.x, top: selectionAction.y }}
        >
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Create branch from selection"
              aria-keyshortcuts="Meta+Enter Control+Enter"
              className="h-7 rounded-full px-2 text-xs"
              onClick={handleBranchFromSelection}
            >
              <GitBranchPlus className="h-3.5 w-3.5" />
              分叉
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Take note from selection"
              className="h-7 rounded-full px-2 text-xs"
              onClick={handleNoteFromSelection}
            >
              <NotebookPen className="h-3.5 w-3.5" />
              记录笔记
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
