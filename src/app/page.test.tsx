import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WORKSPACE_STATE_KEY } from "@/lib/session/workspaceState";
import HomePage from "./page";

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("HomePage", () => {
  it("renders updated layout without account/search placeholder", () => {
    render(<HomePage />);

    expect(screen.queryByText("研究与沉淀")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("搜索聊天记录")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "全部笔记" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "设置" })).toBeInTheDocument();
    expect(screen.getByText("Edit Oct 08")).toBeInTheDocument();
    expect(screen.queryByText(/当前分支:/)).not.toBeInTheDocument();
  });

  it("toggles desktop sidebar from topbar trigger", () => {
    render(<HomePage />);

    const desktopSidebar = screen.getByTestId("sidebar-desktop");
    expect(desktopSidebar).toHaveAttribute("data-state", "expanded");

    fireEvent.click(screen.getByTestId("topbar-sidebar-trigger"));
    expect(desktopSidebar).toHaveAttribute("data-state", "collapsed");
  });

  it("switches top title by sidebar section", () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: "全部笔记" }));
    expect(screen.getAllByText("全部笔记").length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    expect(screen.getAllByText("搜索").length).toBeGreaterThan(1);
  });

  it("supports sending message and mock streaming reply", () => {
    render(<HomePage />);

    expect(screen.getAllByTestId(/assistant-group-/)).toHaveLength(2);

    const input = screen.getByLabelText("聊天输入");
    fireEvent.change(input, { target: { value: "给我一个可执行的研究流程" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("给我一个可执行的研究流程")).toBeInTheDocument();
    expect(screen.getAllByTestId(/assistant-group-/)).toHaveLength(3);
  });

  it("creates retry variant and shows variant navigator", () => {
    render(<HomePage />);

    const retryButtons = screen.getAllByRole("button", { name: "Retry" });
    fireEvent.click(retryButtons[0]);

    expect(screen.getByText(/2\s*\/\s*2/)).toBeInTheDocument();
  });

  it("switches to graph mode after creating branch from assistant action", () => {
    render(<HomePage />);

    fireEvent.click(screen.getAllByRole("button", { name: "Create Branch" })[0]);

    expect(screen.getByTestId("graph-canvas")).toBeInTheDocument();
    expect(screen.getByLabelText("聊天输入")).toBeInTheDocument();
  });

  it("creates selection branch with emphasized selected text context", () => {
    render(<HomePage />);

    const assistantText = screen.getByText(
      /可以先把文献对比拆成固定字段：研究问题、数据来源、方法路线、实验设置、核心结论和局限/
    );
    const textNode = assistantText.firstChild;
    expect(textNode).toBeTruthy();

    const removeAllRanges = vi.fn();
    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      toString: () => "固定字段",
      anchorNode: textNode,
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ left: 120, width: 60, top: 150 })
      }),
      removeAllRanges
    } as unknown as Selection);

    fireEvent.mouseUp(screen.getByTestId("chat-scroll-area"));
    fireEvent.click(screen.getByRole("button", { name: "Create branch from selection" }));

    expect(removeAllRanges).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("graph-canvas")).toBeInTheDocument();

    const rawSnapshot = window.localStorage.getItem(WORKSPACE_STATE_KEY);
    expect(rawSnapshot).not.toBeNull();

    const workspace = JSON.parse(rawSnapshot ?? "{}");
    const activeConversation = workspace.conversations.find(
      (item: { id: string }) => item.id === workspace.activeConversationId
    ) as {
      snapshot: {
        messagesByNode: Record<string, Array<{ content: string }>>;
        activeNodeId: string;
      };
    };
    const activeMessages = activeConversation.snapshot.messagesByNode[activeConversation.snapshot.activeNodeId];

    expect(
      activeMessages.some(
        (message: { content: string }) =>
          message.content.includes("固定字段") && message.content.includes("最高优先级上下文")
      )
    ).toBe(true);
  });

  it("opens topbar more menu and toggles favorite state", () => {
    render(<HomePage />);

    const favoriteButton = screen.getByRole("button", { name: "Favorite" });
    expect(favoriteButton).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(favoriteButton);
    expect(favoriteButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("menuitem", { name: "Customize Page" })).toBeInTheDocument();
  });

  it("shows conversation list pane from sidebar entry", () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: "全部对话" }));
    expect(screen.getByText("All Conversations")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New Chat/i })).toBeInTheDocument();
  });

  it("captures notes from assistant actions and renders in notes pane", () => {
    render(<HomePage />);

    fireEvent.click(screen.getAllByRole("button", { name: "Take Note" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "全部笔记" }));

    expect(screen.getByText("All Notes")).toBeInTheDocument();
    expect(screen.getAllByText(/可以先把文献对比拆成固定字段/).length).toBeGreaterThan(0);
  });

  it("opens settings modal and saves provider configuration", () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: "设置" }));
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();

    const providerInput = screen.getByLabelText("API Base URL");
    fireEvent.change(providerInput, { target: { value: "https://example-llm.test/v1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const rawWorkspace = window.localStorage.getItem(WORKSPACE_STATE_KEY);
    expect(rawWorkspace).not.toBeNull();
    const workspace = JSON.parse(rawWorkspace ?? "{}");
    expect(workspace.modelProvider.providerUrl).toBe("https://example-llm.test/v1");
  });
});
