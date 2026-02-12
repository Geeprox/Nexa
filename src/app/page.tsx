"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BranchCreatePayload,
  ChatMessage,
  ChatPane,
  RetryMessagePayload
} from "@/components/chat/ChatPane";
import { GraphNode, GraphPane } from "@/components/graph/GraphPane";
import { Sidebar, SidebarSection } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { pickRandomMockReply } from "@/lib/mock/chatResponses";
import {
  ConversationSnapshot,
  loadConversationSnapshot,
  saveConversationSnapshot
} from "@/lib/session/conversationSnapshot";

const initialMessagesByNode: Record<string, ChatMessage[]> = {
  root: [
    {
      id: "m-user-1",
      nodeId: "root",
      role: "user",
      content: "如何用 LLM 做文献对比？"
    },
    {
      id: "m-assistant-1",
      nodeId: "root",
      role: "assistant",
      content:
        "可以先把文献对比拆成固定字段：研究问题、数据来源、方法路线、实验设置、核心结论和局限。随后让模型按统一模板逐篇抽取，再用表格聚合。关键不在于一次回答很长，而在于字段定义稳定，这样你才能持续追加新文献并做横向比较。",
      replyToMessageId: "m-user-1",
      retryIndex: 1
    },
    {
      id: "m-user-2",
      nodeId: "root",
      role: "user",
      content: "那如果不同论文指标口径不一致怎么办？"
    },
    {
      id: "m-assistant-2",
      nodeId: "root",
      role: "assistant",
      content:
        "先做指标归一化字典，把同义指标映射到统一维度，比如把不同命名的准确率、召回率映射到同一评价层。对无法直接映射的指标，要求模型输出“原指标 + 解释 + 可比性等级”。最终你会得到一个既能自动聚合又保留差异上下文的比较矩阵，避免把不可比数据硬合并。",
      replyToMessageId: "m-user-2",
      retryIndex: 1
    }
  ]
};

const initialNodes: GraphNode[] = [
  {
    id: "root",
    parentId: null,
    title: "起点问题",
    createdAt: "2026-02-12T09:00:00.000Z",
    position: {
      x: 40,
      y: 140
    }
  }
];

function toBranchTitle(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= 20) {
    return compact;
  }
  return `${compact.slice(0, 20)}...`;
}

function nextBranchPosition(allNodes: GraphNode[], parentId: string) {
  const parent = allNodes.find((node) => node.id === parentId);
  if (!parent) {
    return { x: 380, y: 140 };
  }

  const children = allNodes.filter((node) => node.parentId === parentId);
  return {
    x: parent.position.x + 280,
    y: parent.position.y + children.length * 140
  };
}

function deriveConversationTitle(messages: ChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user")?.content ?? "未命名会话";
  const compact = firstUserMessage.replace(/\s+/g, " ").trim();
  if (compact.length <= 18) {
    return compact;
  }
  return `${compact.slice(0, 18)}...`;
}

function cloneConversationContext(
  sourceMessages: ChatMessage[],
  sourceMessageId: string,
  targetNodeId: string
) {
  const cutoffIndex = sourceMessages.findIndex((message) => message.id === sourceMessageId);
  const slice = cutoffIndex >= 0 ? sourceMessages.slice(0, cutoffIndex + 1) : sourceMessages;

  const idMap = new Map<string, string>();
  for (const message of slice) {
    idMap.set(message.id, `m-${crypto.randomUUID().slice(0, 8)}`);
  }

  return slice.map((message) => ({
    ...message,
    id: idMap.get(message.id) ?? `m-${crypto.randomUUID().slice(0, 8)}`,
    nodeId: targetNodeId,
    replyToMessageId: message.replyToMessageId ? idMap.get(message.replyToMessageId) : undefined,
    isStreaming: false
  }));
}

export default function HomePage() {
  const initialSnapshot = useMemo<ConversationSnapshot>(() => {
    return (
      loadConversationSnapshot() ?? {
        version: 1,
        nodes: initialNodes,
        messagesByNode: initialMessagesByNode,
        activeNodeId: "root",
        conversationTags: [],
        dismissedAutoTags: []
      }
    );
  }, []);

  const [messagesByNode, setMessagesByNode] = useState(initialSnapshot.messagesByNode);
  const [nodes, setNodes] = useState(initialSnapshot.nodes);
  const [activeNodeId, setActiveNodeId] = useState(initialSnapshot.activeNodeId);
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SidebarSection>("ask-ai");
  const streamTimersRef = useRef<Map<string, number>>(new Map());

  const clearStreamingTimer = useCallback((messageId: string) => {
    const timerId = streamTimersRef.current.get(messageId);
    if (timerId !== undefined) {
      window.clearInterval(timerId);
      streamTimersRef.current.delete(messageId);
    }
  }, []);

  useEffect(() => {
    const activeTimers = streamTimersRef.current;
    return () => {
      for (const timerId of activeTimers.values()) {
        window.clearInterval(timerId);
      }
      activeTimers.clear();
    };
  }, []);

  const startStreamingAssistantReply = useCallback(
    ({
      nodeId,
      replyToMessageId,
      content,
      messageId,
      retryIndex,
      insertAfterMessageId
    }: {
      nodeId: string;
      replyToMessageId: string;
      content: string;
      messageId: string;
      retryIndex: number;
      insertAfterMessageId?: string;
    }) => {
      clearStreamingTimer(messageId);

      setMessagesByNode((current) => {
        const bucket = current[nodeId] ?? [];
        const nextAssistantMessage: ChatMessage = {
          id: messageId,
          nodeId,
          role: "assistant",
          content: "",
          replyToMessageId,
          retryIndex,
          isStreaming: true
        };

        if (!insertAfterMessageId) {
          return {
            ...current,
            [nodeId]: [...bucket, nextAssistantMessage]
          };
        }

        const anchorIndex = bucket.findIndex((message) => message.id === insertAfterMessageId);
        if (anchorIndex < 0) {
          return {
            ...current,
            [nodeId]: [...bucket, nextAssistantMessage]
          };
        }

        return {
          ...current,
          [nodeId]: [
            ...bucket.slice(0, anchorIndex + 1),
            nextAssistantMessage,
            ...bucket.slice(anchorIndex + 1)
          ]
        };
      });

      let cursor = 0;
      const intervalId = window.setInterval(() => {
        const chunkSize = 16 + Math.floor(Math.random() * 10);
        cursor = Math.min(content.length, cursor + chunkSize);
        const nextContent = content.slice(0, cursor);
        const finished = cursor >= content.length;

        setMessagesByNode((current) => {
          const bucket = current[nodeId] ?? [];
          return {
            ...current,
            [nodeId]: bucket.map((message) => {
              if (message.id !== messageId) {
                return message;
              }
              return {
                ...message,
                content: nextContent,
                isStreaming: !finished
              };
            })
          };
        });

        if (finished) {
          clearStreamingTimer(messageId);
        }
      }, 45);

      streamTimersRef.current.set(messageId, intervalId);
    },
    [clearStreamingTimer]
  );

  const handleSendMessage = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }

      const nodeId = activeNodeId;
      const userMessageId = `m-${crypto.randomUUID().slice(0, 8)}`;
      setMessagesByNode((current) => {
        const bucket = current[nodeId] ?? [];
        return {
          ...current,
          [nodeId]: [
            ...bucket,
            {
              id: userMessageId,
              nodeId,
              role: "user",
              content: trimmed
            }
          ]
        };
      });

      const reply = pickRandomMockReply(trimmed);
      const assistantMessageId = `m-${crypto.randomUUID().slice(0, 8)}`;
      startStreamingAssistantReply({
        nodeId,
        replyToMessageId: userMessageId,
        content: reply,
        messageId: assistantMessageId,
        retryIndex: 1
      });
    },
    [activeNodeId, startStreamingAssistantReply]
  );

  const handleRetryMessage = useCallback(
    (payload: RetryMessagePayload) => {
      const sourceMessages = messagesByNode[payload.sourceNodeId] ?? [];
      const sourcePrompt = sourceMessages.find(
        (message) => message.id === payload.replyToMessageId && message.role === "user"
      );

      if (!sourcePrompt) {
        return;
      }

      const previousReplyMessages = sourceMessages.filter(
        (message) =>
          message.role === "assistant" && message.replyToMessageId === payload.replyToMessageId
      );
      const previousReplies = previousReplyMessages
        .map((message) => message.content)
        .filter((item) => item.trim().length > 0);

      const retryIndex = previousReplyMessages.length + 1;
      const reply = pickRandomMockReply(sourcePrompt.content, previousReplies);
      const assistantMessageId = `m-${crypto.randomUUID().slice(0, 8)}`;

      startStreamingAssistantReply({
        nodeId: payload.sourceNodeId,
        replyToMessageId: payload.replyToMessageId,
        content: reply,
        messageId: assistantMessageId,
        retryIndex,
        insertAfterMessageId: previousReplyMessages.at(-1)?.id
      });
    },
    [messagesByNode, startStreamingAssistantReply]
  );

  const handleCreateBranch = useCallback(
    (payload: BranchCreatePayload) => {
      const sourceMessages = messagesByNode[payload.sourceNodeId] ?? [];
      if (sourceMessages.length === 0) {
        return;
      }

      const branchNodeId = `node-${crypto.randomUUID().slice(0, 8)}`;
      const sourceMessage = sourceMessages.find((message) => message.id === payload.sourceMessageId);
      const titleSource = payload.mode === "selection" ? payload.selectedText : sourceMessage?.content ?? "新分支";
      const clonedMessages = cloneConversationContext(
        sourceMessages,
        payload.sourceMessageId,
        branchNodeId
      );

      const nextMessages =
        payload.mode === "selection"
          ? [
              ...clonedMessages,
              {
                id: `m-${crypto.randomUUID().slice(0, 8)}`,
                nodeId: branchNodeId,
                role: "user" as const,
                content: `请重点围绕以下选中文案继续深入，并将其作为本次回答的最高优先级上下文：\n\n「${payload.selectedText}」`
              }
            ]
          : clonedMessages;

      setNodes((current) => [
        ...current,
        {
          id: branchNodeId,
          parentId: payload.sourceNodeId,
          title: toBranchTitle(titleSource),
          createdAt: new Date().toISOString(),
          position: nextBranchPosition(current, payload.sourceNodeId)
        }
      ]);

      setMessagesByNode((current) => ({
        ...current,
        [branchNodeId]: nextMessages
      }));

      setFocusedMessageId(null);
      setActiveNodeId(branchNodeId);
    },
    [messagesByNode]
  );

  const handleSelectNode = useCallback((nodeId: string) => {
    setFocusedMessageId(null);
    setActiveNodeId(nodeId);
  }, []);

  const handleMoveNode = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setNodes((current) =>
      current.map((node) => (node.id === nodeId ? { ...node, position } : node))
    );
  }, []);

  useEffect(() => {
    if (nodes.length === 0) {
      return;
    }

    if (!nodes.some((node) => node.id === activeNodeId)) {
      setActiveNodeId(nodes[0].id);
      return;
    }

    saveConversationSnapshot({
      version: 1,
      nodes,
      messagesByNode,
      activeNodeId,
      conversationTags: [],
      dismissedAutoTags: []
    });
  }, [activeNodeId, messagesByNode, nodes]);

  const activeNode = nodes.find((node) => node.id === activeNodeId);
  const activeMessages = useMemo(() => messagesByNode[activeNodeId] ?? [], [messagesByNode, activeNodeId]);
  const hasBranches = nodes.some((node) => node.parentId !== null);
  const conversationTitle = useMemo(() => deriveConversationTitle(activeMessages), [activeMessages]);

  const topBarTitle = useMemo(() => {
    if (activeSection === "notes") {
      return "全部笔记";
    }

    if (activeSection === "search") {
      return "搜索";
    }

    return conversationTitle;
  }, [activeSection, conversationTitle]);

  return (
    <SidebarProvider>
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <SidebarInset className="min-h-svh">
        <TopBar title={topBarTitle} />
        <div className="min-h-0 flex-1 bg-muted/40">
          {hasBranches ? (
            <GraphPane
              nodes={nodes}
              activeNodeId={activeNodeId}
              onSelectNode={handleSelectNode}
              onMoveNode={handleMoveNode}
            />
          ) : (
            <ChatPane
              activeNodeTitle={activeNode?.title ?? "未命名分支"}
              messages={activeMessages}
              focusedMessageId={focusedMessageId}
              onCreateBranch={handleCreateBranch}
              onRetryMessage={handleRetryMessage}
              onSendMessage={handleSendMessage}
            />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
