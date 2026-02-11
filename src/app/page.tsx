"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BranchCreatePayload,
  ChatMessage,
  ChatPane
} from "@/components/chat/ChatPane";
import { GraphNode, GraphPane } from "@/components/graph/GraphPane";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { InMemoryAdapter } from "@/lib/db";
import { TagRepository } from "@/lib/db/tagRepository";
import { AutoTagOrchestrator } from "@/lib/jobs/autoTagOrchestrator";
import { JobQueue } from "@/lib/jobs/queue";
import { NoteSearchHit } from "@/lib/db/types";
import { ConversationSearchRecord, FtsSearchRepository } from "@/lib/search/ftsSearchRepository";
import { autoTagEntity } from "@/lib/tagging";
import {
  ConversationSnapshot,
  loadConversationSnapshot,
  saveConversationSnapshot
} from "@/lib/session/conversationSnapshot";
import { cn } from "@/lib/utils";

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
        "可以先定义比较框架（研究问题、方法、数据、结论），再用 LLM 逐篇抽取关键变量，最后生成对照表与差异矩阵。"
    },
    {
      id: "m-assistant-2",
      nodeId: "root",
      role: "assistant",
      content:
        "如果你选中某一句话，可以立即分叉追问，系统会在右侧图谱创建新节点。"
    }
  ]
};

const initialNodes: GraphNode[] = [
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
    y: parent.position.y + children.length * 120
  };
}

interface ConversationTagEntry {
  name: string;
  source: "manual" | "auto";
  confidence: number | null;
}

function normalizeTagName(name: string) {
  return name.trim().toLowerCase();
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);

    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
    };
  }, [query]);

  return matches;
}

export default function HomePage() {
  const isCompactLayout = useMediaQuery("(max-width: 1200px)");
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ConversationSearchRecord[]>([]);
  const [noteSearchResults, setNoteSearchResults] = useState<NoteSearchHit[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [conversationTags, setConversationTags] = useState<ConversationTagEntry[]>(
    initialSnapshot.conversationTags
  );
  const [dismissedAutoTags, setDismissedAutoTags] = useState<string[]>(
    initialSnapshot.dismissedAutoTags
  );
  const [tagError, setTagError] = useState<string | null>(null);
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const [isGraphPanelOpen, setIsGraphPanelOpen] = useState(false);
  const [hasHydratedTags, setHasHydratedTags] = useState(false);
  const [pendingTagJobs, setPendingTagJobs] = useState(0);
  const latestAutoTagRunId = useRef(0);
  const [tagAdapter] = useState(() => new InMemoryAdapter());
  const [tagRepository] = useState(() => new TagRepository(tagAdapter));
  const [jobQueue] = useState(
    () =>
      new JobQueue({
        onJobUpdate: async (job) => {
          await tagAdapter.enqueueJob({
            id: job.id,
            type: job.type,
            payload: JSON.stringify(job.payload),
            status: job.status,
            createdAt: job.createdAt
          });
        }
      })
  );
  const [autoTagOrchestrator] = useState(
    () => new AutoTagOrchestrator(jobQueue, tagRepository, autoTagEntity)
  );

  const handleCreateBranch = useCallback((payload: BranchCreatePayload) => {
    const nodeId = `node-${crypto.randomUUID().slice(0, 8)}`;

    setNodes((current) => {
      const nextNode: GraphNode = {
        id: nodeId,
        parentId: payload.sourceNodeId,
        title: toBranchTitle(payload.selectedText),
        createdAt: new Date().toISOString(),
        position: nextBranchPosition(current, payload.sourceNodeId)
      };
      return [...current, nextNode];
    });

    setMessagesByNode((current) => ({
      ...current,
      [nodeId]: [
        {
          id: `m-user-${crypto.randomUUID().slice(0, 8)}`,
          nodeId,
          role: "user",
          content: `围绕这段内容继续追问：${payload.selectedText}`
        }
      ]
    }));
    setFocusedMessageId(null);
    setActiveNodeId(nodeId);
  }, []);

  const handleSelectNode = useCallback((nodeId: string) => {
    setFocusedMessageId(null);
    setActiveNodeId(nodeId);
  }, []);

  const handleSearchSelect = useCallback((result: ConversationSearchRecord) => {
    setActiveNodeId(result.nodeId);
    setFocusedMessageId(result.messageId);
  }, []);

  const handleNoteSearchSelect = useCallback((result: NoteSearchHit) => {
    if (result.sourceNodeId) {
      setActiveNodeId(result.sourceNodeId);
    }
    setFocusedMessageId(result.sourceMessageId ?? null);
  }, []);

  const handleMoveNode = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setNodes((current) =>
      current.map((node) => (node.id === nodeId ? { ...node, position } : node))
    );
  }, []);

  const handleToggleGraphPanel = useCallback(() => {
    setIsGraphPanelOpen((open) => !open);
  }, []);

  const handleAddManualTag = useCallback((name: string) => {
    const tagName = name.trim();
    if (!tagName) {
      return;
    }

    const normalized = normalizeTagName(tagName);
    setDismissedAutoTags((current) => current.filter((item) => item !== normalized));
    setConversationTags((current) => {
      if (current.some((item) => normalizeTagName(item.name) === normalized)) {
        return current;
      }
      return [...current, { name: tagName, source: "manual", confidence: null }];
    });
  }, []);

  const handleRemoveManualTag = useCallback((name: string) => {
    const normalized = normalizeTagName(name);
    setConversationTags((current) =>
      current.filter(
        (item) => !(item.source === "manual" && normalizeTagName(item.name) === normalized)
      )
    );
  }, []);

  const handleRemoveAutoTag = useCallback((name: string) => {
    const normalized = normalizeTagName(name);
    setDismissedAutoTags((current) => (current.includes(normalized) ? current : [...current, normalized]));
    setConversationTags((current) =>
      current.filter((item) => !(item.source === "auto" && normalizeTagName(item.name) === normalized))
    );
  }, []);

  const runAutoTagging = useCallback(async () => {
    const content = nodes
      .flatMap((node) => messagesByNode[node.id] ?? [])
      .map((message) => message.content)
      .join("\n");

    const runId = latestAutoTagRunId.current + 1;
    latestAutoTagRunId.current = runId;

    setPendingTagJobs((current) => current + 1);
    setTagError(null);
    try {
      const tags = await autoTagOrchestrator.enqueueAndWait({
        entityId: "active-conversation",
        entityType: "conversation",
        content,
        dismissedAutoTags
      });
      if (latestAutoTagRunId.current === runId) {
        setConversationTags(tags);
      }
    } catch {
      if (latestAutoTagRunId.current === runId) {
        setTagError("自动标签任务失败，请稍后重试。");
      }
    } finally {
      setPendingTagJobs((current) => Math.max(0, current - 1));
    }
  }, [autoTagOrchestrator, dismissedAutoTags, messagesByNode, nodes]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setNoteSearchResults([]);
      setSearchError(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const adapter = new InMemoryAdapter();
        const repository = new FtsSearchRepository(adapter);
        const rootNode = nodes.find((node) => node.parentId === null) ?? nodes[0];

        if (!rootNode) {
          return;
        }

        await adapter.saveConversation({
          id: "active-conversation",
          title: "当前会话",
          rootNodeId: rootNode.id,
          createdAt: rootNode.createdAt
        });

        for (const node of nodes) {
          await adapter.saveNode({
            id: node.id,
            conversationId: "active-conversation",
            parentId: node.parentId,
            summary: node.title,
            status: "active",
            posX: node.position.x,
            posY: node.position.y,
            createdAt: node.createdAt
          });
        }

        for (const node of nodes) {
          const messages = messagesByNode[node.id] ?? [];
          for (let index = 0; index < messages.length; index += 1) {
            const message = messages[index];
            await adapter.saveMessage({
              id: message.id,
              nodeId: message.nodeId,
              role: message.role,
              content: message.content,
              createdAt: `${node.createdAt}.${String(index).padStart(3, "0")}`
            });
          }
        }

        const result = await repository.searchAll(query);
        if (cancelled) {
          return;
        }

        setSearchResults(result.conversation);
        setNoteSearchResults(result.notes);
        setSearchError(null);
      } catch {
        if (cancelled) {
          return;
        }
        setSearchResults([]);
        setNoteSearchResults([]);
        setSearchError("搜索失败，请稍后重试。");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [messagesByNode, nodes, searchQuery]);

  useEffect(() => {
    if (!hasHydratedTags) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runAutoTagging();
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasHydratedTags, runAutoTagging]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const loaded = await tagRepository.loadEntityTags("conversation", "active-conversation");
        if (cancelled) {
          return;
        }

        if (loaded.length > 0) {
          setConversationTags(loaded);
        }
      } catch {
        if (!cancelled) {
          setTagError("标签初始化失败，已回退到当前状态。");
        }
      } finally {
        if (!cancelled) {
          setHasHydratedTags(true);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [tagRepository]);

  useEffect(() => {
    if (!hasHydratedTags) {
      return;
    }

    const run = async () => {
      try {
        await tagRepository.syncEntityTags("conversation", "active-conversation", conversationTags);
      } catch {
        setTagError("标签保存失败，将在下次变更时重试。");
      }
    };

    void run();
  }, [conversationTags, hasHydratedTags, tagRepository]);

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
      conversationTags,
      dismissedAutoTags
    });
  }, [activeNodeId, conversationTags, dismissedAutoTags, messagesByNode, nodes]);

  useEffect(() => {
    setIsGraphPanelOpen(!isCompactLayout);
  }, [isCompactLayout]);

  const activeNode = nodes.find((node) => node.id === activeNodeId);
  const activeMessages = messagesByNode[activeNodeId] ?? [];
  const manualTags = useMemo(
    () => conversationTags.filter((item) => item.source === "manual").map((item) => item.name),
    [conversationTags]
  );
  const autoTags = useMemo(
    () => conversationTags.filter((item) => item.source === "auto").map((item) => item.name),
    [conversationTags]
  );

  return (
    <SidebarProvider>
      <Sidebar
        searchQuery={searchQuery}
        searchResults={searchResults}
        noteResults={noteSearchResults}
        searchError={searchError}
        manualTags={manualTags}
        autoTags={autoTags}
        onSearchQueryChange={setSearchQuery}
        onSelectSearchResult={handleSearchSelect}
        onSelectNoteResult={handleNoteSearchSelect}
        onAddManualTag={handleAddManualTag}
        onRemoveManualTag={handleRemoveManualTag}
        onRemoveAutoTag={handleRemoveAutoTag}
      />

      <SidebarInset className="min-h-svh">
        <TopBar
          isCompactLayout={isCompactLayout}
          isGraphPanelOpen={isGraphPanelOpen}
          isGeneratingTags={pendingTagJobs > 0}
          tagStatusMessage={
            tagError
              ? tagError
              : pendingTagJobs > 0
                ? "自动标签任务进行中..."
                : "自动标签已开启"
          }
          tagStatusVariant={tagError ? "error" : "default"}
          onToggleGraphPanel={handleToggleGraphPanel}
          onGenerateTags={() => {
            void runAutoTagging();
          }}
        />
        <div
          className={cn(
            "grid min-h-0 flex-1",
            isCompactLayout ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_360px]"
          )}
        >
          <div className="min-h-0 bg-muted/40">
            <ChatPane
              activeNodeTitle={activeNode?.title ?? "未命名分支"}
              messages={activeMessages}
              focusedMessageId={focusedMessageId}
              onCreateBranch={handleCreateBranch}
            />
          </div>
          {!isCompactLayout ? (
            <GraphPane
              nodes={nodes}
              activeNodeId={activeNodeId}
              onSelectNode={handleSelectNode}
              onMoveNode={handleMoveNode}
            />
          ) : null}
        </div>

        {isCompactLayout ? (
          <>
            <button
              type="button"
              aria-label="关闭图谱面板"
              data-testid="graph-drawer-overlay"
              className={cn(
                "fixed inset-0 z-30 bg-black/20 transition-opacity duration-200 ease-out motion-reduce:transition-none",
                isGraphPanelOpen ? "opacity-100" : "pointer-events-none opacity-0"
              )}
              onClick={() => setIsGraphPanelOpen(false)}
            />
            <aside
              data-testid="graph-drawer"
              className={cn(
                "fixed inset-y-0 right-0 z-40 w-[min(92vw,420px)] border-l bg-background shadow-lg transition-transform duration-200 ease-out motion-reduce:transition-none",
                isGraphPanelOpen ? "translate-x-0" : "translate-x-full"
              )}
            >
              <GraphPane
                nodes={nodes}
                activeNodeId={activeNodeId}
                onSelectNode={handleSelectNode}
                onMoveNode={handleMoveNode}
              />
            </aside>
          </>
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  );
}
