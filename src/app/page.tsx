"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BranchCreatePayload,
  ChatMessage,
  ChatPane,
  NoteCreatePayload,
  RetryMessagePayload
} from "@/components/chat/ChatPane";
import { ChatComposer } from "@/components/chat/ChatComposer";
import {
  ConversationListPane,
  ConversationSummary
} from "@/components/conversation/ConversationListPane";
import { GraphNode, GraphPane } from "@/components/graph/GraphPane";
import { Sidebar, SidebarSection } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { NotesPane } from "@/components/notes/NotesPane";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { streamMockProviderResponse } from "@/lib/llm/mockProvider";
import { logError, logInfo } from "@/lib/logging/logger";
import { resolveNonOverlappingPosition } from "@/lib/graph/layout";
import { INITIAL_CHAT_TURNS } from "@/lib/mock/chatResponses";
import { ConversationSnapshot } from "@/lib/session/conversationSnapshot";
import {
  DEFAULT_MODEL_PROVIDER_SETTINGS,
  WorkspaceConversation,
  WorkspaceNote,
  WorkspaceState,
  loadWorkspaceState,
  saveWorkspaceState
} from "@/lib/session/workspaceState";

interface PendingBranchDraft {
  sourceNodeId: string;
  sourceMessageId: string;
  mode: "selection" | "clone";
  quoteText: string;
  quotePreview: string;
}

const GRAPH_COLUMN_GAP_X = 640;
const GRAPH_ROW_GAP_Y = 260;

function createInitialMessagesByNode(): Record<string, ChatMessage[]> {
  const rootMessages: ChatMessage[] = [];
  for (let index = 0; index < INITIAL_CHAT_TURNS.length; index += 1) {
    const turn = INITIAL_CHAT_TURNS[index];
    const userMessageId = `m-user-${index + 1}`;
    rootMessages.push({
      id: userMessageId,
      nodeId: "root",
      role: "user",
      content: turn.user
    });

    rootMessages.push({
      id: `m-assistant-${index + 1}`,
      nodeId: "root",
      role: "assistant",
      content: turn.assistant,
      replyToMessageId: userMessageId,
      retryIndex: 1
    });
  }

  return {
    root: rootMessages
  };
}

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

function createInitialSnapshot(): ConversationSnapshot {
  return {
    version: 1,
    nodes: initialNodes,
    messagesByNode: createInitialMessagesByNode(),
    activeNodeId: "root",
    conversationTags: [],
    dismissedAutoTags: []
  };
}

function deriveConversationTitleFromSnapshot(snapshot: ConversationSnapshot) {
  const firstUserMessage = Object.values(snapshot.messagesByNode)
    .flat()
    .find((message) => message.role === "user")?.content;
  if (!firstUserMessage) {
    return "New chat";
  }

  const compact = firstUserMessage.trim().replace(/\s+/g, " ");
  if (!compact) {
    return "New chat";
  }

  return compact.length <= 24 ? compact : `${compact.slice(0, 24)}...`;
}

function createConversationRecord(snapshot: ConversationSnapshot): WorkspaceConversation {
  const now = new Date().toISOString();
  return {
    id: `conv-${crypto.randomUUID().slice(0, 8)}`,
    title: deriveConversationTitleFromSnapshot(snapshot),
    createdAt: now,
    updatedAt: now,
    snapshot
  };
}

function createEmptyConversationRecord(): WorkspaceConversation {
  const snapshot: ConversationSnapshot = {
    version: 1,
    nodes: [
      {
        id: "root",
        parentId: null,
        title: "起点问题",
        createdAt: new Date().toISOString(),
        position: {
          x: 40,
          y: 140
        }
      }
    ],
    messagesByNode: {
      root: []
    },
    activeNodeId: "root",
    conversationTags: [],
    dismissedAutoTags: []
  };

  return {
    ...createConversationRecord(snapshot),
    title: "New chat"
  };
}

function createFallbackWorkspace(): WorkspaceState {
  const conversation = createConversationRecord(createInitialSnapshot());
  return {
    version: 2,
    conversations: [conversation],
    activeConversationId: conversation.id,
    notes: [],
    modelProvider: DEFAULT_MODEL_PROVIDER_SETTINGS
  };
}

function toBranchTitle(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= 20) {
    return compact;
  }
  return `${compact.slice(0, 20)}...`;
}

function hasBranchNodes(snapshot: ConversationSnapshot) {
  return snapshot.nodes.some((node) => node.parentId !== null);
}

function toQuotePreview(text: string, limit = 100) {
  const compact = text.trim().replace(/\s+/g, " ");
  if (!compact) {
    return "";
  }

  return compact.length <= limit ? compact : `${compact.slice(0, limit)}...`;
}

function buildPromptWithQuote(question: string, pendingBranch: PendingBranchDraft | null) {
  if (!pendingBranch) {
    return question;
  }

  return `${question}\n\nPlease prioritize the quoted context below for this response:\n${pendingBranch.quoteText}`;
}

function nextBranchPosition(allNodes: GraphNode[], parentId: string) {
  const parent = allNodes.find((node) => node.id === parentId);
  if (!parent) {
    return { x: 40 + GRAPH_COLUMN_GAP_X, y: 160 };
  }

  const children = allNodes.filter((node) => node.parentId === parentId);
  return {
    x: parent.position.x + GRAPH_COLUMN_GAP_X,
    y: parent.position.y + children.length * GRAPH_ROW_GAP_Y
  };
}

function resolveLinearRootNode(snapshot: ConversationSnapshot) {
  return snapshot.nodes.find((node) => node.parentId === null)?.id ?? snapshot.activeNodeId;
}

function buildTurnTopologyFromLinearMessages(linearMessages: ChatMessage[]) {
  const userMessages = linearMessages.filter((message) => message.role === "user");
  const assistantByPrompt = new Map<string, ChatMessage[]>();
  for (const message of linearMessages) {
    if (message.role !== "assistant" || !message.replyToMessageId) {
      continue;
    }

    const bucket = assistantByPrompt.get(message.replyToMessageId) ?? [];
    bucket.push(message);
    assistantByPrompt.set(message.replyToMessageId, bucket);
  }

  const messageNodeMap = new Map<string, string>();
  const nodes: GraphNode[] = [];
  const messagesByNode: Record<string, ChatMessage[]> = {};

  let previousNodeId: string | null = null;

  for (let index = 0; index < userMessages.length; index += 1) {
    const userMessage = userMessages[index];
    const nodeId = `node-turn-${index + 1}-${crypto.randomUUID().slice(0, 6)}`;

    const assistantVariants = assistantByPrompt.get(userMessage.id) ?? [];
    const activeAssistant = assistantVariants.at(-1);

    const nextBucket: ChatMessage[] = [
      {
        ...userMessage,
        nodeId
      }
    ];

    if (activeAssistant) {
      nextBucket.push({
        ...activeAssistant,
        nodeId,
        isStreaming: false,
        retryIndex: 1
      });
    }

    messagesByNode[nodeId] = nextBucket;
    messageNodeMap.set(userMessage.id, nodeId);
    for (const assistant of assistantVariants) {
      messageNodeMap.set(assistant.id, nodeId);
    }

    nodes.push({
      id: nodeId,
      parentId: previousNodeId,
      title: toBranchTitle(userMessage.content || `Turn ${index + 1}`),
      createdAt: new Date(Date.now() + index * 1000).toISOString(),
      position: {
        x: 40 + index * GRAPH_COLUMN_GAP_X,
        y: 160
      }
    });

    previousNodeId = nodeId;
  }

  if (nodes.length === 0) {
    const rootNodeId = `node-turn-root-${crypto.randomUUID().slice(0, 6)}`;
    nodes.push({
      id: rootNodeId,
      parentId: null,
      title: "Root",
      createdAt: new Date().toISOString(),
      position: {
        x: 40,
        y: 160
      }
    });
    messagesByNode[rootNodeId] = [];
    return {
      nodes,
      messagesByNode,
      messageNodeMap,
      lastNodeId: rootNodeId
    };
  }

  return {
    nodes,
    messagesByNode,
    messageNodeMap,
    lastNodeId: nodes[nodes.length - 1].id
  };
}

export default function HomePage() {
  const initialWorkspace = useMemo<WorkspaceState>(() => {
    return loadWorkspaceState() ?? createFallbackWorkspace();
  }, []);

  const [conversations, setConversations] = useState(initialWorkspace.conversations);
  const [activeConversationId, setActiveConversationId] = useState(initialWorkspace.activeConversationId);
  const [activeSection, setActiveSection] = useState<SidebarSection>("ask-ai");
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const [notes, setNotes] = useState(initialWorkspace.notes);
  const [modelProvider, setModelProvider] = useState(initialWorkspace.modelProvider);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pendingBranchDraft, setPendingBranchDraft] = useState<PendingBranchDraft | null>(null);

  const streamControllersRef = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      logError("window.error", event.error ?? event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError("window.unhandledrejection", event.reason);
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const controllers = streamControllersRef.current;
    return () => {
      for (const controller of controllers.values()) {
        controller.abort();
      }
      controllers.clear();
    };
  }, []);

  const activeConversation = useMemo(() => {
    return conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0] ?? null;
  }, [activeConversationId, conversations]);

  useEffect(() => {
    if (!activeConversation && conversations[0]) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversation, conversations]);

  useEffect(() => {
    if (!activeConversation) {
      return;
    }

    const success = saveWorkspaceState({
      version: 2,
      conversations,
      activeConversationId: activeConversation.id,
      notes,
      modelProvider
    });

    if (!success) {
      logError("workspace", new Error("Failed to save workspace state"), {
        activeConversationId: activeConversation.id
      });
    }
  }, [activeConversation, conversations, modelProvider, notes]);

  useEffect(() => {
    setPendingBranchDraft(null);
  }, [activeConversationId]);

  const commitSnapshot = useCallback(
    (
      conversationId: string,
      updater: (snapshot: ConversationSnapshot) => ConversationSnapshot,
      options?: {
        refreshTitle?: boolean;
      }
    ) => {
      setConversations((current) =>
        current.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          const nextSnapshot = updater(conversation.snapshot);
          const nextTitle = options?.refreshTitle
            ? deriveConversationTitleFromSnapshot(nextSnapshot)
            : conversation.title;

          return {
            ...conversation,
            title: nextTitle,
            updatedAt: new Date().toISOString(),
            snapshot: nextSnapshot
          };
        })
      );
    },
    []
  );

  const streamAssistantReply = useCallback(
    async ({
      conversationId,
      nodeId,
      replyToMessageId,
      retryIndex,
      insertAfterMessageId,
      prompt,
      previousReplies = []
    }: {
      conversationId: string;
      nodeId: string;
      replyToMessageId: string;
      retryIndex: number;
      insertAfterMessageId?: string;
      prompt: string;
      previousReplies?: string[];
    }) => {
      const assistantMessageId = `m-${crypto.randomUUID().slice(0, 8)}`;
      const streamKey = `${conversationId}:${assistantMessageId}`;
      const controller = new AbortController();
      streamControllersRef.current.set(streamKey, controller);

      commitSnapshot(conversationId, (snapshot) => {
        const bucket = snapshot.messagesByNode[nodeId] ?? [];
        const nextMessage: ChatMessage = {
          id: assistantMessageId,
          nodeId,
          role: "assistant",
          content: "",
          replyToMessageId,
          retryIndex,
          isStreaming: true
        };

        const anchorIndex = insertAfterMessageId
          ? bucket.findIndex((message) => message.id === insertAfterMessageId)
          : -1;
        const nextBucket =
          anchorIndex >= 0
            ? [...bucket.slice(0, anchorIndex + 1), nextMessage, ...bucket.slice(anchorIndex + 1)]
            : [...bucket, nextMessage];

        return {
          ...snapshot,
          messagesByNode: {
            ...snapshot.messagesByNode,
            [nodeId]: nextBucket
          }
        };
      });

      let content = "";

      try {
        const stream = streamMockProviderResponse(
          {
            conversationId,
            prompt,
            previousReplies,
            providerUrl: modelProvider.providerUrl,
            apiKey: modelProvider.apiKey
          },
          {
            signal: controller.signal
          }
        );

        for await (const chunk of stream) {
          if (chunk.done) {
            continue;
          }

          content += chunk.delta;
          commitSnapshot(conversationId, (snapshot) => {
            const bucket = snapshot.messagesByNode[nodeId] ?? [];
            return {
              ...snapshot,
              messagesByNode: {
                ...snapshot.messagesByNode,
                [nodeId]: bucket.map((message) =>
                  message.id === assistantMessageId
                    ? {
                        ...message,
                        content,
                        isStreaming: true
                      }
                    : message
                )
              }
            };
          });
        }

        commitSnapshot(conversationId, (snapshot) => {
          const bucket = snapshot.messagesByNode[nodeId] ?? [];
          return {
            ...snapshot,
            messagesByNode: {
              ...snapshot.messagesByNode,
              [nodeId]: bucket.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      content,
                      isStreaming: false
                    }
                  : message
              )
            }
          };
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          logError("mockProvider.stream", error, {
            conversationId,
            nodeId,
            messageId: assistantMessageId
          });
        }

        commitSnapshot(conversationId, (snapshot) => {
          const bucket = snapshot.messagesByNode[nodeId] ?? [];
          return {
            ...snapshot,
            messagesByNode: {
              ...snapshot.messagesByNode,
              [nodeId]: bucket.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      content: content || "[Mock provider interrupted. Please retry.]",
                      isStreaming: false
                    }
                  : message
              )
            }
          };
        });
      } finally {
        streamControllersRef.current.delete(streamKey);
      }
    },
    [commitSnapshot, modelProvider.apiKey, modelProvider.providerUrl]
  );

  const handlePrepareBranch = useCallback(
    (payload: BranchCreatePayload) => {
      if (!activeConversation) {
        return;
      }

      const sourceMessages = activeConversation.snapshot.messagesByNode[payload.sourceNodeId] ?? [];
      const sourceMessage = sourceMessages.find((message) => message.id === payload.sourceMessageId);
      if (!sourceMessage) {
        return;
      }

      const quoteText =
        payload.mode === "selection" ? payload.selectedText.trim() : sourceMessage.content.trim();
      if (!quoteText) {
        return;
      }

      setPendingBranchDraft({
        sourceNodeId: payload.sourceNodeId,
        sourceMessageId: payload.sourceMessageId,
        mode: payload.mode,
        quoteText,
        quotePreview: toQuotePreview(quoteText, 100)
      });

      if (activeConversation.snapshot.activeNodeId !== payload.sourceNodeId) {
        commitSnapshot(activeConversation.id, (snapshot) => ({
          ...snapshot,
          activeNodeId: payload.sourceNodeId
        }));
      }

      setFocusedMessageId(payload.sourceMessageId);
    },
    [activeConversation, commitSnapshot]
  );

  const handleSendMessage = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || !activeConversation) {
        return;
      }

      const conversationId = activeConversation.id;
      const snapshot = activeConversation.snapshot;
      const branched = hasBranchNodes(snapshot);

      if (!branched && !pendingBranchDraft) {
        const nodeId = resolveLinearRootNode(snapshot);
        const userMessageId = `m-${crypto.randomUUID().slice(0, 8)}`;

        commitSnapshot(
          conversationId,
          (currentSnapshot) => {
            const bucket = currentSnapshot.messagesByNode[nodeId] ?? [];
            return {
              ...currentSnapshot,
              messagesByNode: {
                ...currentSnapshot.messagesByNode,
                [nodeId]: [
                  ...bucket,
                  {
                    id: userMessageId,
                    nodeId,
                    role: "user",
                    content: trimmed
                  }
                ]
              }
            };
          },
          {
            refreshTitle: true
          }
        );

        void streamAssistantReply({
          conversationId,
          nodeId,
          prompt: trimmed,
          replyToMessageId: userMessageId,
          retryIndex: 1
        });
        return;
      }

      const nextNodeId = `node-${crypto.randomUUID().slice(0, 8)}`;
      const userMessageId = `m-${crypto.randomUUID().slice(0, 8)}`;
      const prompt = buildPromptWithQuote(trimmed, pendingBranchDraft);

      if (!branched) {
        const linearRootNodeId = resolveLinearRootNode(snapshot);
        const linearMessages = snapshot.messagesByNode[linearRootNodeId] ?? [];
        const topology = buildTurnTopologyFromLinearMessages(linearMessages);
        const parentNodeId =
          (pendingBranchDraft && topology.messageNodeMap.get(pendingBranchDraft.sourceMessageId)) ??
          topology.lastNodeId;

        commitSnapshot(conversationId, (currentSnapshot) => {
          const userMessage: ChatMessage = {
            id: userMessageId,
            nodeId: nextNodeId,
            role: "user",
            content: trimmed,
            quotedText: pendingBranchDraft?.quoteText,
            quotePreview: pendingBranchDraft?.quotePreview,
            quotedMessageId: pendingBranchDraft?.sourceMessageId,
            quotedNodeId: pendingBranchDraft?.sourceNodeId
          };

          const proposedPosition = nextBranchPosition(topology.nodes, parentNodeId);
          const nextMessagesByNode = {
            ...topology.messagesByNode,
            [nextNodeId]: [userMessage]
          };
          const resolvedPosition = resolveNonOverlappingPosition({
            nodes: topology.nodes,
            messagesByNode: nextMessagesByNode,
            candidateNodeId: nextNodeId,
            candidatePosition: proposedPosition
          });

          return {
            ...currentSnapshot,
            nodes: [
              ...topology.nodes,
              {
                id: nextNodeId,
                parentId: parentNodeId,
                title: toBranchTitle(trimmed),
                createdAt: new Date().toISOString(),
                position: resolvedPosition
              }
            ],
            messagesByNode: nextMessagesByNode,
            activeNodeId: nextNodeId
          };
        });
      } else {
        const parentNodeId =
          pendingBranchDraft?.sourceNodeId && snapshot.nodes.some((node) => node.id === pendingBranchDraft.sourceNodeId)
            ? pendingBranchDraft.sourceNodeId
            : snapshot.activeNodeId;

        commitSnapshot(conversationId, (currentSnapshot) => {
          const userMessage: ChatMessage = {
            id: userMessageId,
            nodeId: nextNodeId,
            role: "user",
            content: trimmed,
            quotedText: pendingBranchDraft?.quoteText,
            quotePreview: pendingBranchDraft?.quotePreview,
            quotedMessageId: pendingBranchDraft?.sourceMessageId,
            quotedNodeId: pendingBranchDraft?.sourceNodeId
          };

          const proposedPosition = nextBranchPosition(currentSnapshot.nodes, parentNodeId);
          const nextMessagesByNode = {
            ...currentSnapshot.messagesByNode,
            [nextNodeId]: [userMessage]
          };
          const resolvedPosition = resolveNonOverlappingPosition({
            nodes: currentSnapshot.nodes,
            messagesByNode: nextMessagesByNode,
            candidateNodeId: nextNodeId,
            candidatePosition: proposedPosition
          });

          return {
            ...currentSnapshot,
            nodes: [
              ...currentSnapshot.nodes,
              {
                id: nextNodeId,
                parentId: parentNodeId,
                title: toBranchTitle(trimmed),
                createdAt: new Date().toISOString(),
                position: resolvedPosition
              }
            ],
            messagesByNode: nextMessagesByNode,
            activeNodeId: nextNodeId
          };
        });
      }

      setPendingBranchDraft(null);
      setFocusedMessageId(null);

      void streamAssistantReply({
        conversationId,
        nodeId: nextNodeId,
        prompt,
        replyToMessageId: userMessageId,
        retryIndex: 1
      });
    },
    [activeConversation, commitSnapshot, pendingBranchDraft, streamAssistantReply]
  );

  const handleRetryMessage = useCallback(
    (payload: RetryMessagePayload) => {
      if (!activeConversation) {
        return;
      }

      const sourceMessages = activeConversation.snapshot.messagesByNode[payload.sourceNodeId] ?? [];
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
      void streamAssistantReply({
        conversationId: activeConversation.id,
        nodeId: payload.sourceNodeId,
        prompt: sourcePrompt.content,
        replyToMessageId: payload.replyToMessageId,
        retryIndex,
        insertAfterMessageId: previousReplyMessages.at(-1)?.id,
        previousReplies
      });
    },
    [activeConversation, streamAssistantReply]
  );

  const handleCreateNote = useCallback(
    (payload: NoteCreatePayload) => {
      if (!activeConversation) {
        return;
      }

      const compact = payload.content.trim().replace(/\s+/g, " ");
      if (!compact) {
        return;
      }

      const title = compact.length <= 32 ? compact : `${compact.slice(0, 32)}...`;
      const note: WorkspaceNote = {
        id: `note-${crypto.randomUUID().slice(0, 8)}`,
        title,
        content: payload.content,
        sourceConversationId: activeConversation.id,
        sourceNodeId: payload.sourceNodeId,
        sourceMessageId: payload.sourceMessageId,
        createdAt: new Date().toISOString()
      };

      setNotes((current) => [note, ...current]);
      logInfo("note", "Note captured from chat response.", {
        conversationId: activeConversation.id,
        sourceMessageId: payload.sourceMessageId,
        mode: payload.mode
      });
    },
    [activeConversation]
  );

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      if (!activeConversation) {
        return;
      }

      commitSnapshot(activeConversation.id, (snapshot) => ({
        ...snapshot,
        activeNodeId: nodeId
      }));
      setFocusedMessageId(null);
    },
    [activeConversation, commitSnapshot]
  );

  const handleMoveNode = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      if (!activeConversation) {
        return;
      }

      commitSnapshot(activeConversation.id, (snapshot) => {
        const nextNodes = snapshot.nodes.map((node) => (node.id === nodeId ? { ...node, position } : node));
        const resolvedPosition = resolveNonOverlappingPosition({
          nodes: nextNodes,
          messagesByNode: snapshot.messagesByNode,
          candidateNodeId: nodeId,
          candidatePosition: position
        });

        return {
          ...snapshot,
          nodes: nextNodes.map((node) =>
            node.id === nodeId ? { ...node, position: resolvedPosition } : node
          )
        };
      });
    },
    [activeConversation, commitSnapshot]
  );

  const handleCreateConversation = useCallback(() => {
    const nextConversation = createEmptyConversationRecord();
    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
    setActiveSection("ask-ai");
    setFocusedMessageId(null);
    setPendingBranchDraft(null);
  }, []);

  const handleSelectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    setFocusedMessageId(null);
    setPendingBranchDraft(null);
    setActiveSection("ask-ai");
  }, []);

  const conversationSummaries = useMemo<ConversationSummary[]>(() => {
    return [...conversations]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        updatedAt: new Date(conversation.updatedAt).toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        }),
        messageCount: Object.values(conversation.snapshot.messagesByNode).flat().length,
        hasBranches: hasBranchNodes(conversation.snapshot)
      }));
  }, [conversations]);

  const notesForView = useMemo(() => {
    const conversationTitleMap = new Map(
      conversations.map((conversation) => [conversation.id, conversation.title])
    );

    return notes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      sourceConversationTitle:
        conversationTitleMap.get(note.sourceConversationId) ?? "Unknown conversation",
      createdAt: new Date(note.createdAt).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      })
    }));
  }, [conversations, notes]);

  const activeSnapshot = activeConversation?.snapshot ?? null;
  const linearRootNodeId = activeSnapshot ? resolveLinearRootNode(activeSnapshot) : null;
  const activeMessages = activeSnapshot && linearRootNodeId
    ? activeSnapshot.messagesByNode[linearRootNodeId] ?? []
    : [];
  const branched = activeSnapshot ? hasBranchNodes(activeSnapshot) : false;

  const topBarTitle = useMemo(() => {
    if (activeSection === "notes") {
      return "全部笔记";
    }

    if (activeSection === "conversations") {
      return "全部对话";
    }

    if (activeSection === "search") {
      return "搜索";
    }

    return activeConversation?.title ?? "New chat";
  }, [activeConversation?.title, activeSection]);

  return (
    <SidebarProvider>
      <Sidebar
        activeSection={activeSection}
        activeConversationId={activeConversation?.id}
        conversations={conversationSummaries.map((item) => ({
          id: item.id,
          title: item.title
        }))}
        onSectionChange={setActiveSection}
        onSelectConversation={handleSelectConversation}
        onCreateConversation={handleCreateConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <SidebarInset className="min-h-svh">
        <TopBar title={topBarTitle} />

        <div className="min-h-0 flex-1 bg-muted/40">
          {activeSection === "conversations" ? (
            <ConversationListPane
              conversations={conversationSummaries}
              activeConversationId={activeConversation?.id ?? ""}
              onSelectConversation={handleSelectConversation}
              onCreateConversation={handleCreateConversation}
            />
          ) : null}

          {activeSection === "notes" ? <NotesPane notes={notesForView} /> : null}

          {activeSection === "search" ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="rounded-xl border border-dashed bg-card/70 px-4 py-8 text-sm text-muted-foreground">
                搜索视图将在后续版本完善，当前可通过“全部对话/全部笔记”浏览内容。
              </div>
            </div>
          ) : null}

          {activeSection === "ask-ai" && activeSnapshot ? (
            branched ? (
              <div className="grid h-full min-h-0 grid-rows-[1fr_auto]">
                <GraphPane
                  nodes={activeSnapshot.nodes}
                  messagesByNode={activeSnapshot.messagesByNode}
                  activeNodeId={activeSnapshot.activeNodeId}
                  onSelectNode={handleSelectNode}
                  onMoveNode={handleMoveNode}
                  onCreateBranch={handlePrepareBranch}
                  onCreateNote={handleCreateNote}
                />
                <ChatComposer
                  quotePreview={pendingBranchDraft?.quotePreview ?? null}
                  onClearQuote={() => setPendingBranchDraft(null)}
                  onSendMessage={handleSendMessage}
                />
              </div>
            ) : (
              <ChatPane
                messages={activeMessages}
                focusedMessageId={focusedMessageId}
                quotePreview={pendingBranchDraft?.quotePreview ?? null}
                onClearQuote={() => setPendingBranchDraft(null)}
                onCreateBranch={handlePrepareBranch}
                onCreateNote={handleCreateNote}
                onRetryMessage={handleRetryMessage}
                onSendMessage={handleSendMessage}
              />
            )
          ) : null}
        </div>
      </SidebarInset>

      <SettingsModal
        open={isSettingsOpen}
        settings={modelProvider}
        onOpenChange={setIsSettingsOpen}
        onSave={setModelProvider}
      />
    </SidebarProvider>
  );
}
