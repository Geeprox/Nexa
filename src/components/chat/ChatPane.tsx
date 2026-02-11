"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  nodeId: string;
  role: "user" | "assistant";
  content: string;
}

export interface BranchCreatePayload {
  sourceMessageId: string;
  sourceNodeId: string;
  selectedText: string;
}

interface BranchActionState {
  x: number;
  y: number;
  sourceMessageId: string;
  sourceNodeId: string;
  selectedText: string;
}

interface ChatPaneProps {
  activeNodeTitle: string;
  messages: ChatMessage[];
  focusedMessageId?: string | null;
  onCreateBranch: (payload: BranchCreatePayload) => void;
}

export function ChatPane({
  activeNodeTitle,
  messages,
  focusedMessageId,
  onCreateBranch
}: ChatPaneProps) {
  const [branchAction, setBranchAction] = useState<BranchActionState | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const hideBranchAction = useCallback(() => {
    setBranchAction(null);
  }, []);

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      hideBranchAction();
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      hideBranchAction();
      return;
    }

    const anchorNode = selection.anchorNode;
    if (!anchorNode) {
      hideBranchAction();
      return;
    }

    const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode.parentElement;
    const messageElement = anchorElement?.closest<HTMLElement>(
      "[data-message-role='assistant'][data-message-id][data-node-id]"
    );

    if (!messageElement || !scrollAreaRef.current?.contains(messageElement)) {
      hideBranchAction();
      return;
    }

    const sourceMessageId = messageElement.dataset.messageId;
    const sourceNodeId = messageElement.dataset.nodeId;
    if (!sourceMessageId || !sourceNodeId) {
      hideBranchAction();
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setBranchAction({
      x: rect.left + rect.width / 2,
      y: Math.max(12, rect.top - 12),
      sourceMessageId,
      sourceNodeId,
      selectedText
    });
  }, [hideBranchAction]);

  const handleBranch = useCallback(() => {
    if (!branchAction) {
      return;
    }

    onCreateBranch({
      sourceMessageId: branchAction.sourceMessageId,
      sourceNodeId: branchAction.sourceNodeId,
      selectedText: branchAction.selectedText
    });

    window.getSelection()?.removeAllRanges();
    hideBranchAction();
  }, [branchAction, hideBranchAction, onCreateBranch]);

  useEffect(() => {
    if (!branchAction) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleBranch();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        hideBranchAction();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [branchAction, handleBranch, hideBranchAction]);

  useEffect(() => {
    if (!focusedMessageId || !scrollAreaRef.current) {
      return;
    }

    const target = scrollAreaRef.current.querySelector<HTMLElement>(
      `[data-message-id='${focusedMessageId}']`
    );
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView?.({
      block: "center",
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });
  }, [focusedMessageId]);

  return (
    <div className="flex h-full flex-col" onMouseDownCapture={hideBranchAction}>
      <div
        ref={scrollAreaRef}
        data-testid="chat-scroll-area"
        className="flex-1 space-y-6 overflow-auto px-6 py-6"
        onMouseUp={handleSelection}
        onScroll={hideBranchAction}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            hideBranchAction();
          }
        }}
      >
        <div className="flex items-center gap-2">
          <span className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            当前分支: {activeNodeTitle}
          </span>
        </div>

        {messages.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/80 px-4 py-6 text-sm text-muted-foreground">
            当前分支暂无消息，选中回答后可创建追问分支。
          </div>
        ) : null}

        {messages.map((message) => {
          const roleClass =
            message.role === "user"
              ? "ml-auto w-3/4 bg-secondary/90 text-secondary-foreground"
              : "w-4/5 bg-card hover:border-foreground/20";
          const focusedClass =
            message.id === focusedMessageId ? "border-ring/50 ring-2 ring-ring/40" : "";

          return (
            <div
              key={message.id}
              data-message-id={message.id}
              data-node-id={message.nodeId}
              data-message-role={message.role}
              className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed transition-colors duration-150 motion-reduce:transition-none ${roleClass} ${focusedClass}`}
            >
              <span>{message.content}</span>
            </div>
          );
        })}
      </div>

      {branchAction ? (
        <button
          type="button"
          aria-keyshortcuts="Meta+Enter Control+Enter"
          className="fixed z-20 inline-flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          style={{ left: branchAction.x, top: branchAction.y }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onClick={handleBranch}
        >
          分叉
          <span className="text-[10px] text-muted-foreground">⌘/Ctrl+Enter</span>
        </button>
      ) : null}

      <div className="border-t bg-background/80 px-6 py-4">
        <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          输入你的追问，支持流式回答与即时分叉
        </div>
      </div>
    </div>
  );
}
