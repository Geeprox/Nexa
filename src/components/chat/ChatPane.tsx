"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  nodeId: string;
  role: "user" | "assistant";
  content: string;
  replyToMessageId?: string;
  retryIndex?: number;
  isStreaming?: boolean;
}

export type BranchCreatePayload =
  | {
      mode: "clone";
      sourceMessageId: string;
      sourceNodeId: string;
    }
  | {
      mode: "selection";
      sourceMessageId: string;
      sourceNodeId: string;
      selectedText: string;
    };

export interface RetryMessagePayload {
  sourceNodeId: string;
  sourceMessageId: string;
  replyToMessageId: string;
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
  onRetryMessage: (payload: RetryMessagePayload) => void;
  onSendMessage: (value: string) => void;
}

interface MessageBlock {
  kind: "message";
  message: ChatMessage;
}

interface AssistantGroupBlock {
  kind: "assistant-group";
  groupId: string;
  variants: ChatMessage[];
}

type RenderBlock = MessageBlock | AssistantGroupBlock;

export function ChatPane({
  activeNodeTitle,
  messages,
  focusedMessageId,
  onCreateBranch,
  onRetryMessage,
  onSendMessage
}: ChatPaneProps) {
  const [branchAction, setBranchAction] = useState<BranchActionState | null>(null);
  const [draft, setDraft] = useState("");
  const [activeRetryByGroup, setActiveRetryByGroup] = useState<Record<string, number>>({});
  const previousGroupCountsRef = useRef<Record<string, number>>({});
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const hideBranchAction = useCallback(() => {
    setBranchAction(null);
  }, []);

  const renderBlocks = useMemo<RenderBlock[]>(() => {
    const blocks: RenderBlock[] = [];

    for (const message of messages) {
      if (message.role === "assistant" && message.replyToMessageId) {
        const previous = blocks[blocks.length - 1];
        if (previous?.kind === "assistant-group" && previous.groupId === message.replyToMessageId) {
          previous.variants.push(message);
          continue;
        }

        blocks.push({
          kind: "assistant-group",
          groupId: message.replyToMessageId,
          variants: [message]
        });
        continue;
      }

      blocks.push({
        kind: "message",
        message
      });
    }

    return blocks;
  }, [messages]);

  useEffect(() => {
    const nextGroupCounts: Record<string, number> = {};
    for (const block of renderBlocks) {
      if (block.kind !== "assistant-group") {
        continue;
      }
      nextGroupCounts[block.groupId] = block.variants.length;
    }

    setActiveRetryByGroup((current) => {
      const next = { ...current };
      let changed = false;

      for (const [groupId, count] of Object.entries(nextGroupCounts)) {
        const previousCount = previousGroupCountsRef.current[groupId] ?? 0;
        const currentIndex = next[groupId];

        if (count !== previousCount || currentIndex === undefined || currentIndex >= count) {
          next[groupId] = count - 1;
          changed = true;
        }
      }

      for (const groupId of Object.keys(next)) {
        if (nextGroupCounts[groupId] === undefined) {
          delete next[groupId];
          changed = true;
        }
      }

      previousGroupCountsRef.current = nextGroupCounts;
      return changed ? next : current;
    });
  }, [renderBlocks]);

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

  const handleBranchFromSelection = useCallback(() => {
    if (!branchAction) {
      return;
    }

    onCreateBranch({
      mode: "selection",
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
        handleBranchFromSelection();
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
  }, [branchAction, handleBranchFromSelection, hideBranchAction]);

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

  const handleCopyMessage = useCallback(async (content: string) => {
    if (!navigator?.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // ignore clipboard failure in unsupported environments
    }
  }, []);

  const handleSubmitDraft = useCallback(() => {
    const value = draft.trim();
    if (!value) {
      return;
    }

    onSendMessage(value);
    setDraft("");
  }, [draft, onSendMessage]);

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
            当前分支暂无消息，输入问题后将以流式 Mock 回复。
          </div>
        ) : null}

        {renderBlocks.map((block, index) => {
          if (block.kind === "message") {
            const { message } = block;
            const roleClass =
              message.role === "user"
                ? "ml-auto w-3/4 bg-secondary/90 text-secondary-foreground"
                : "w-4/5 bg-card hover:border-foreground/20";
            const focusedClass =
              message.id === focusedMessageId ? "border-ring/50 ring-2 ring-ring/40" : "";

            return (
              <div
                key={message.id}
                data-testid={`chat-message-${message.id}`}
                data-message-id={message.id}
                data-node-id={message.nodeId}
                data-message-role={message.role}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm leading-relaxed transition-colors duration-150 motion-reduce:transition-none",
                  roleClass,
                  focusedClass
                )}
              >
                <span>{message.content}</span>
              </div>
            );
          }

          const currentIndex = activeRetryByGroup[block.groupId] ?? block.variants.length - 1;
          const boundedIndex = Math.max(0, Math.min(currentIndex, block.variants.length - 1));
          const activeVariant = block.variants[boundedIndex];
          const focusedClass =
            activeVariant.id === focusedMessageId ? "border-ring/50 ring-2 ring-ring/40" : "";

          return (
            <div
              key={`${block.groupId}-${index}`}
              data-testid={`assistant-group-${block.groupId}`}
              data-message-id={activeVariant.id}
              data-node-id={activeVariant.nodeId}
              data-message-role="assistant"
              className={cn(
                "w-4/5 rounded-2xl border bg-card px-4 py-3 text-sm leading-relaxed transition-colors duration-150 motion-reduce:transition-none hover:border-foreground/20",
                focusedClass
              )}
            >
              <span>{activeVariant.content}</span>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <button
                  type="button"
                  className="rounded px-1 py-0.5 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  onClick={() => {
                    void handleCopyMessage(activeVariant.content);
                  }}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="rounded px-1 py-0.5 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={activeVariant.isStreaming}
                  onClick={() =>
                    onRetryMessage({
                      sourceNodeId: activeVariant.nodeId,
                      sourceMessageId: activeVariant.id,
                      replyToMessageId: block.groupId
                    })
                  }
                >
                  Retry
                </button>
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded px-1 py-0.5 opacity-50"
                >
                  Share
                </button>
                <button
                  type="button"
                  className="rounded px-1 py-0.5 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  onClick={() =>
                    onCreateBranch({
                      mode: "clone",
                      sourceMessageId: activeVariant.id,
                      sourceNodeId: activeVariant.nodeId
                    })
                  }
                >
                  Create Branch
                </button>

                {block.variants.length > 1 ? (
                  <div className="ml-1 inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Show previous retry"
                      className="inline-flex h-5 w-5 items-center justify-center rounded border text-[11px] transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      onClick={() =>
                        setActiveRetryByGroup((current) => ({
                          ...current,
                          [block.groupId]: Math.max(0, boundedIndex - 1)
                        }))
                      }
                    >
                      {"<"}
                    </button>
                    <span>{`${boundedIndex + 1} / ${block.variants.length}`}</span>
                    <button
                      type="button"
                      aria-label="Show next retry"
                      className="inline-flex h-5 w-5 items-center justify-center rounded border text-[11px] transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      onClick={() =>
                        setActiveRetryByGroup((current) => ({
                          ...current,
                          [block.groupId]: Math.min(block.variants.length - 1, boundedIndex + 1)
                        }))
                      }
                    >
                      {">"}
                    </button>
                  </div>
                ) : null}
              </div>
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
          onClick={handleBranchFromSelection}
        >
          分叉
          <span className="text-[10px] text-muted-foreground">⌘/Ctrl+Enter</span>
        </button>
      ) : null}

      <div className="border-t bg-background/80 px-6 py-4">
        <div className="flex items-end gap-3 rounded-xl border bg-card px-3 py-3">
          <Sparkles className="mb-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <textarea
            aria-label="聊天输入"
            className="max-h-44 min-h-8 w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="输入你的问题，按 Enter 发送"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmitDraft();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
