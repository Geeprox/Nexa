import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPane, ChatMessage } from "./ChatPane";

const messages: ChatMessage[] = [
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
    content: "可以先定义比较框架，再逐步分析。"
  }
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ChatPane", () => {
  it("opens branch action from selected assistant text", () => {
    const onCreateBranch = vi.fn();
    render(
      <ChatPane
        activeNodeTitle="起点问题"
        messages={messages}
        onCreateBranch={onCreateBranch}
      />
    );

    const assistantText = screen.getByText("可以先定义比较框架，再逐步分析。");
    const textNode = assistantText.firstChild;
    expect(textNode).toBeTruthy();

    const removeAllRanges = vi.fn();
    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      toString: () => "比较框架",
      anchorNode: textNode,
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ left: 120, width: 60, top: 150 })
      }),
      removeAllRanges
    } as unknown as Selection);

    fireEvent.mouseUp(screen.getByTestId("chat-scroll-area"));
    fireEvent.click(screen.getByRole("button", { name: /分叉/ }));

    expect(onCreateBranch).toHaveBeenCalledTimes(1);
    expect(onCreateBranch).toHaveBeenCalledWith({
      sourceMessageId: "m-assistant-1",
      sourceNodeId: "root",
      selectedText: "比较框架"
    });
    expect(removeAllRanges).toHaveBeenCalledTimes(1);
  });

  it("shows empty-state for node without messages", () => {
    render(
      <ChatPane
        activeNodeTitle="空分支"
        messages={[]}
        onCreateBranch={vi.fn()}
      />
    );

    expect(screen.getByText("当前分支: 空分支")).toBeInTheDocument();
    expect(
      screen.getByText("当前分支暂无消息，选中回答后可创建追问分支。")
    ).toBeInTheDocument();
  });

  it("highlights focused message", () => {
    render(
      <ChatPane
        activeNodeTitle="起点问题"
        messages={messages}
        focusedMessageId="m-assistant-1"
        onCreateBranch={vi.fn()}
      />
    );

    const focused = screen
      .getAllByText("可以先定义比较框架，再逐步分析。")
      .map((node) => node.closest("div"))
      .find((node) => node?.className.includes("ring-2"));

    expect(focused).toBeDefined();
  });

  it("supports keyboard shortcut to trigger branch creation", () => {
    const onCreateBranch = vi.fn();
    render(
      <ChatPane
        activeNodeTitle="起点问题"
        messages={messages}
        onCreateBranch={onCreateBranch}
      />
    );

    const assistantText = screen.getByText("可以先定义比较框架，再逐步分析。");
    const textNode = assistantText.firstChild;
    expect(textNode).toBeTruthy();

    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      toString: () => "比较框架",
      anchorNode: textNode,
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ left: 120, width: 60, top: 150 })
      }),
      removeAllRanges: vi.fn()
    } as unknown as Selection);

    fireEvent.mouseUp(screen.getByTestId("chat-scroll-area"));
    expect(screen.getByRole("button", { name: /分叉/ })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Enter", metaKey: true });
    expect(onCreateBranch).toHaveBeenCalledWith({
      sourceMessageId: "m-assistant-1",
      sourceNodeId: "root",
      selectedText: "比较框架"
    });
  });
});
