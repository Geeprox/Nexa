"use client";

import {
  ArrowLeft,
  ArrowRight,
  Copy,
  CornerUpLeft,
  GitBranchPlus,
  NotebookPen,
  RotateCcw,
  Share2
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { logError } from "@/lib/logging/logger";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  nodeId: string;
  role: "user" | "assistant";
  content: string;
  replyToMessageId?: string;
  retryIndex?: number;
  isStreaming?: boolean;
  quotedText?: string;
  quotePreview?: string;
  quotedMessageId?: string;
  quotedNodeId?: string;
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

export interface NoteCreatePayload {
  mode: "message" | "selection";
  sourceMessageId: string;
  sourceNodeId: string;
  content: string;
}

interface BranchActionState {
  x: number;
  y: number;
  sourceMessageId: string;
  sourceNodeId: string;
  selectedText: string;
}

interface ChatPaneProps {
  messages: ChatMessage[];
  focusedMessageId?: string | null;
  quotePreview?: string | null;
  onClearQuote?: () => void;
  onCreateBranch: (payload: BranchCreatePayload) => void;
  onCreateNote: (payload: NoteCreatePayload) => void;
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

function toQuotedPreview(message: ChatMessage) {
  const source = message.quotePreview ?? message.quotedText;
  if (!source) {
    return null;
  }

  const compact = source.trim().replace(/\s+/g, " ");
  if (!compact) {
    return null;
  }

  return compact.length <= 120 ? compact : `${compact.slice(0, 120)}...`;
}

export function ChatPane({
  messages,
  focusedMessageId,
  quotePreview,
  onClearQuote,
  onCreateBranch,
  onCreateNote,
  onRetryMessage,
  onSendMessage
}: ChatPaneProps) {
  const [branchAction, setBranchAction] = useState<BranchActionState | null>(null);
  const [activeRetryByGroup, setActiveRetryByGroup] = useState<Record<string, number>>({});
  const previousGroupCountsRef = useRef<Record<string, number>>({});
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const hideBranchAction = useCallback(() => {
    setBranchAction(null);
  }, []);

  const findMessageElement = useCallback((selection: Selection, range: Range) => {
    const selector = "[data-message-id][data-node-id]";
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
      if (candidate && scrollAreaRef.current?.contains(candidate)) {
        return candidate;
      }
    }

    if (!scrollAreaRef.current) {
      return null;
    }

    const messageElements = scrollAreaRef.current.querySelectorAll<HTMLElement>(selector);
    for (const messageElement of messageElements) {
      try {
        if (range.intersectsNode(messageElement)) {
          return messageElement;
        }
      } catch {
        // Ignore detached ranges from rapid DOM updates.
      }
    }

    return null;
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

  const updateBranchActionFromSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      hideBranchAction();
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      hideBranchAction();
      return;
    }

    const range = selection.getRangeAt(0);
    const messageElement = findMessageElement(selection, range);

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

    const rect = range.getBoundingClientRect();
    const fallbackRect = messageElement.getBoundingClientRect();
    const left =
      rect.width > 0 ? rect.left + rect.width / 2 : fallbackRect.left + Math.min(120, fallbackRect.width / 2);
    const top = rect.top > 0 ? rect.top : fallbackRect.top;

    setBranchAction({
      x: left,
      y: Math.max(14, top - 10),
      sourceMessageId,
      sourceNodeId,
      selectedText
    });
  }, [findMessageElement, hideBranchAction]);

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

  const handleNoteFromSelection = useCallback(() => {
    if (!branchAction) {
      return;
    }

    onCreateNote({
      mode: "selection",
      sourceMessageId: branchAction.sourceMessageId,
      sourceNodeId: branchAction.sourceNodeId,
      content: branchAction.selectedText
    });

    window.getSelection()?.removeAllRanges();
    hideBranchAction();
  }, [branchAction, hideBranchAction, onCreateNote]);

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

    const target = scrollAreaRef.current.querySelector<HTMLElement>(`[data-message-id='${focusedMessageId}']`);
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
    } catch (error) {
      logError("chat.copy", error, {
        message: "Failed to copy assistant content."
      });
    }
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollAreaRef}
        data-testid="chat-scroll-area"
        className="flex-1 space-y-5 overflow-auto px-6 py-6"
        onMouseUp={updateBranchActionFromSelection}
        onPointerUp={updateBranchActionFromSelection}
        onScroll={hideBranchAction}
      >
        {messages.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/80 px-4 py-6 text-sm text-muted-foreground">
            当前会话暂无消息，输入问题后将以流式 Mock 回复。
          </div>
        ) : null}

        {renderBlocks.map((block, index) => {
          if (block.kind === "message") {
            const { message } = block;
            const roleClass =
              message.role === "user"
                ? "ml-auto max-w-[78%] bg-secondary/90 text-secondary-foreground"
                : "max-w-[80%] bg-card";
            const focusedClass = message.id === focusedMessageId ? "border-ring/50 ring-2 ring-ring/40" : "";
            const quotedPreview = toQuotedPreview(message);

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
                {quotedPreview ? (
                  <div className="mb-2 rounded-xl border bg-background/50 px-2.5 py-2 text-xs text-muted-foreground">
                    <div className="mb-1 flex items-center gap-1">
                      <CornerUpLeft className="h-3.5 w-3.5" />
                      <span>Quoted context</span>
                    </div>
                    <p className="whitespace-pre-wrap">“{quotedPreview}”</p>
                  </div>
                ) : null}
                <span className="select-text whitespace-pre-wrap">{message.content}</span>
              </div>
            );
          }

          const currentIndex = activeRetryByGroup[block.groupId] ?? block.variants.length - 1;
          const boundedIndex = Math.max(0, Math.min(currentIndex, block.variants.length - 1));
          const activeVariant = block.variants[boundedIndex];
          const focusedClass = activeVariant.id === focusedMessageId ? "border-ring/50 ring-2 ring-ring/40" : "";

          return (
            <div
              key={`${block.groupId}-${index}`}
              data-testid={`assistant-group-${block.groupId}`}
              data-message-id={activeVariant.id}
              data-node-id={activeVariant.nodeId}
              data-message-role="assistant"
              className="max-w-[80%]"
            >
              <div
                className={cn(
                  "rounded-2xl border bg-card px-4 py-3 text-sm leading-relaxed transition-colors duration-150 motion-reduce:transition-none hover:border-foreground/20",
                  focusedClass
                )}
              >
                <span className="select-text whitespace-pre-wrap">{activeVariant.content}</span>
              </div>

              <div className="mt-1 flex items-center gap-0.5 pl-1 text-muted-foreground">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Copy"
                  className="h-7 w-7"
                  onClick={() => {
                    void handleCopyMessage(activeVariant.content);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Retry"
                  className="h-7 w-7"
                  disabled={activeVariant.isStreaming}
                  onClick={() =>
                    onRetryMessage({
                      sourceNodeId: activeVariant.nodeId,
                      sourceMessageId: activeVariant.id,
                      replyToMessageId: block.groupId
                    })
                  }
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                <Button type="button" variant="ghost" size="icon" aria-label="Share" className="h-7 w-7" disabled>
                  <Share2 className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Create Branch"
                  className="h-7 w-7"
                  onClick={() =>
                    onCreateBranch({
                      mode: "clone",
                      sourceMessageId: activeVariant.id,
                      sourceNodeId: activeVariant.nodeId
                    })
                  }
                >
                  <GitBranchPlus className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Take Note"
                  className="h-7 w-7"
                  onClick={() =>
                    onCreateNote({
                      mode: "message",
                      sourceMessageId: activeVariant.id,
                      sourceNodeId: activeVariant.nodeId,
                      content: activeVariant.content
                    })
                  }
                >
                  <NotebookPen className="h-4 w-4" />
                </Button>

                {block.variants.length > 1 ? (
                  <div className="ml-1 inline-flex items-center gap-1 rounded-full border px-1 py-0.5 text-[11px] text-muted-foreground">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Show previous retry"
                      className="h-5 w-5 rounded-full"
                      onClick={() =>
                        setActiveRetryByGroup((current) => ({
                          ...current,
                          [block.groupId]: Math.max(0, boundedIndex - 1)
                        }))
                      }
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span>{`${boundedIndex + 1} / ${block.variants.length}`}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Show next retry"
                      className="h-5 w-5 rounded-full"
                      onClick={() =>
                        setActiveRetryByGroup((current) => ({
                          ...current,
                          [block.groupId]: Math.min(block.variants.length - 1, boundedIndex + 1)
                        }))
                      }
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {branchAction ? (
        <div
          data-branch-fab="true"
          className="fixed z-20 -translate-x-1/2 -translate-y-full rounded-full border bg-card p-1 shadow-sm"
          style={{ left: branchAction.x, top: branchAction.y }}
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

      <ChatComposer quotePreview={quotePreview} onClearQuote={onClearQuote} onSendMessage={onSendMessage} />
    </div>
  );
}
