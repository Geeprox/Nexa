import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FtsSearchRepository } from "@/lib/search/ftsSearchRepository";
import { CONVERSATION_SNAPSHOT_KEY } from "@/lib/session/conversationSnapshot";
import * as taggingModule from "@/lib/tagging";
import HomePage from "./page";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("HomePage", () => {
  function mockAssistantSelection(selectedText: string) {
    const assistantText = screen.getAllByText(
      "可以先定义比较框架（研究问题、方法、数据、结论），再用 LLM 逐篇抽取关键变量，最后生成对照表与差异矩阵。"
    )[0];
    const textNode = assistantText.firstChild;
    expect(textNode).toBeTruthy();

    const removeAllRanges = vi.fn();
    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      toString: () => selectedText,
      anchorNode: textNode,
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ left: 120, width: 60, top: 150 })
      }),
      removeAllRanges
    } as unknown as Selection);

    return { removeAllRanges };
  }

  it("renders base layout", () => {
    render(<HomePage />);

    expect(screen.getByText("Nexa")).toBeInTheDocument();
    expect(screen.getByText("对话图谱")).toBeInTheDocument();
    expect(screen.getByText("起点问题")).toBeInTheDocument();
  });

  it("switches chat context when active graph node changes", () => {
    render(<HomePage />);
    const { removeAllRanges } = mockAssistantSelection("比较框架");

    fireEvent.mouseUp(screen.getAllByTestId("chat-scroll-area")[0]);
    fireEvent.click(screen.getByRole("button", { name: /分叉/ }));

    const branchMessage = "围绕这段内容继续追问：比较框架";
    expect(screen.getByText(branchMessage)).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId("graph-node-root")[0]);

    expect(screen.queryByText(branchMessage)).not.toBeInTheDocument();
    expect(screen.getAllByText("如何用 LLM 做文献对比？").length).toBeGreaterThan(0);
    expect(removeAllRanges).toHaveBeenCalledTimes(1);
  });

  it("restores active branch context from local snapshot", () => {
    window.localStorage.setItem(
      CONVERSATION_SNAPSHOT_KEY,
      JSON.stringify({
        version: 1,
        nodes: [
          {
            id: "root",
            parentId: null,
            title: "起点问题",
            createdAt: "2025-01-01T00:00:00.000Z",
            position: { x: 40, y: 140 }
          },
          {
            id: "node-research",
            parentId: "root",
            title: "研究分支",
            createdAt: "2025-01-01T00:10:00.000Z",
            position: { x: 320, y: 180 }
          }
        ],
        messagesByNode: {
          root: [
            {
              id: "m-root",
              nodeId: "root",
              role: "user",
              content: "root message"
            }
          ],
          "node-research": [
            {
              id: "m-branch",
              nodeId: "node-research",
              role: "assistant",
              content: "branch message"
            }
          ]
        },
        activeNodeId: "node-research"
      })
    );

    render(<HomePage />);

    expect(screen.getByText("当前分支: 研究分支")).toBeInTheDocument();
    expect(screen.getByText("branch message")).toBeInTheDocument();
    expect(screen.queryByText("root message")).not.toBeInTheDocument();
  });

  it("persists snapshot when creating a new branch", () => {
    render(<HomePage />);
    mockAssistantSelection("方法");

    fireEvent.mouseUp(screen.getAllByTestId("chat-scroll-area")[0]);
    fireEvent.click(screen.getByRole("button", { name: /分叉/ }));

    const rawSnapshot = window.localStorage.getItem(CONVERSATION_SNAPSHOT_KEY);
    expect(rawSnapshot).not.toBeNull();

    const snapshot = JSON.parse(rawSnapshot ?? "{}") as {
      nodes: Array<{ id: string; title: string }>;
      activeNodeId: string;
      messagesByNode: Record<string, Array<{ content: string }>>;
    };

    const activeNode = snapshot.nodes.find((node) => node.id === snapshot.activeNodeId);
    expect(activeNode).toBeDefined();
    expect(activeNode?.title).toBe("方法");
    expect(snapshot.messagesByNode[snapshot.activeNodeId]?.[0]?.content).toBe(
      "围绕这段内容继续追问：方法"
    );
  });

  it("jumps to branch message when selecting a search result", async () => {
    render(<HomePage />);
    mockAssistantSelection("方法");

    fireEvent.mouseUp(screen.getAllByTestId("chat-scroll-area")[0]);
    fireEvent.click(screen.getByRole("button", { name: /分叉/ }));
    fireEvent.click(screen.getAllByTestId("graph-node-root")[0]);

    const searchInput = screen.getByLabelText("搜索聊天记录");
    fireEvent.change(searchInput, { target: { value: "继续追问" } });
    const resultButtons = await screen.findAllByTestId(/search-conversation-result-/);
    fireEvent.click(resultButtons[0]);

    const branchMessage = screen
      .getAllByText("围绕这段内容继续追问：方法")
      .find((node) => node.closest("[data-message-id]"));

    expect(branchMessage).toBeDefined();
    expect(branchMessage).toBeInTheDocument();
    expect(branchMessage.closest("div")?.className).toContain("ring-2");
  });

  it("switches graph drawer in compact layout", () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("max-width: 1200px"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });

    try {
      render(<HomePage />);

      expect(screen.getByRole("button", { name: "显示图谱" })).toBeInTheDocument();
      expect(screen.getByTestId("graph-drawer").className).toContain("motion-reduce:transition-none");
      expect(screen.getByTestId("graph-drawer-overlay").className).toContain(
        "motion-reduce:transition-none"
      );

      fireEvent.click(screen.getByRole("button", { name: "显示图谱" }));
      expect(screen.getByRole("button", { name: "隐藏图谱" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "关闭图谱面板" }));
      expect(screen.getByRole("button", { name: "显示图谱" })).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: originalMatchMedia
      });
    }
  });

  it("auto-tags conversation and supports removing system tag", async () => {
    render(<HomePage />);

    const removeAutoTagButton = await screen.findByRole("button", {
      name: "删除系统标签 对比分析"
    });
    expect(screen.getByText("对比分析")).toBeInTheDocument();

    fireEvent.click(removeAutoTagButton);
    expect(screen.queryByText("对比分析")).not.toBeInTheDocument();
  });

  it("persists dismissed system tags across reload", async () => {
    const firstRender = render(<HomePage />);
    const removeAutoTagButton = await screen.findByRole("button", {
      name: "删除系统标签 对比分析"
    });
    fireEvent.click(removeAutoTagButton);
    expect(screen.queryByText("对比分析")).not.toBeInTheDocument();

    firstRender.unmount();
    render(<HomePage />);

    expect(screen.queryByText("对比分析")).not.toBeInTheDocument();
  });

  it("shows search failure state when repository search throws", async () => {
    vi.spyOn(FtsSearchRepository.prototype, "searchAll").mockRejectedValue(new Error("network"));
    render(<HomePage />);

    fireEvent.change(screen.getByLabelText("搜索聊天记录"), { target: { value: "方法" } });

    expect(await screen.findByText("搜索失败，请稍后重试。")).toBeInTheDocument();
  });

  it("shows auto-tag failure status when tagging job fails", async () => {
    vi.spyOn(taggingModule, "autoTagEntity").mockRejectedValue(new Error("provider down"));
    render(<HomePage />);

    expect(await screen.findByText("自动标签任务失败，请稍后重试。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成标签" })).toBeInTheDocument();
  });
});
