import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPane, ChatMessage } from "./ChatPane";

const baseMessages: ChatMessage[] = [
  {
    id: "m-user-1",
    nodeId: "root",
    role: "user",
    content: "如何评估提示词质量？"
  },
  {
    id: "m-assistant-1",
    nodeId: "root",
    role: "assistant",
    content: "可以先定义评估维度，再做对照实验。",
    replyToMessageId: "m-user-1",
    retryIndex: 1
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
        messages={baseMessages}
        onCreateBranch={onCreateBranch}
        onCreateNote={vi.fn()}
        onRetryMessage={vi.fn()}
        onSendMessage={vi.fn()}
      />
    );

    const assistantText = screen.getByText("可以先定义评估维度，再做对照实验。");
    const textNode = assistantText.firstChild as Node;
    expect(textNode).toBeTruthy();
    const assistantGroup = screen.getByTestId("assistant-group-m-user-1");

    const removeAllRanges = vi.fn();
    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      toString: () => "评估维度",
      anchorNode: textNode,
      focusNode: textNode,
      getRangeAt: () => ({
        startContainer: textNode,
        endContainer: textNode,
        commonAncestorContainer: textNode,
        getBoundingClientRect: () => ({ left: 120, width: 60, top: 150 }),
        intersectsNode: (node: Node) => node === assistantGroup
      }),
      removeAllRanges
    } as unknown as Selection);

    fireEvent.mouseUp(screen.getByTestId("chat-scroll-area"));
    fireEvent.click(screen.getByRole("button", { name: "Create branch from selection" }));

    expect(onCreateBranch).toHaveBeenCalledWith({
      mode: "selection",
      sourceMessageId: "m-assistant-1",
      sourceNodeId: "root",
      selectedText: "评估维度"
    });
    expect(removeAllRanges).toHaveBeenCalledTimes(1);
  });

  it("keeps branch action available on reversed selection after mouseup", () => {
    render(
      <ChatPane
        messages={baseMessages}
        onCreateBranch={vi.fn()}
        onCreateNote={vi.fn()}
        onRetryMessage={vi.fn()}
        onSendMessage={vi.fn()}
      />
    );

    const assistantText = screen.getByText("可以先定义评估维度，再做对照实验。");
    const textNode = assistantText.firstChild as Node;
    const outsideNode = document.createTextNode("outside");
    document.body.appendChild(outsideNode);
    const assistantGroup = screen.getByTestId("assistant-group-m-user-1");

    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      toString: () => "对照实验",
      anchorNode: outsideNode,
      focusNode: textNode,
      getRangeAt: () => ({
        startContainer: outsideNode,
        endContainer: textNode,
        commonAncestorContainer: document.body,
        getBoundingClientRect: () => ({ left: 180, width: 40, top: 220 }),
        intersectsNode: (node: Node) => node === assistantGroup
      }),
      removeAllRanges: vi.fn()
    } as unknown as Selection);

    fireEvent.mouseUp(screen.getByTestId("chat-scroll-area"));
    expect(screen.getByRole("button", { name: "Create branch from selection" })).toBeInTheDocument();

    outsideNode.remove();
  });

  it("supports selecting user text and opening branch action", () => {
    const onCreateBranch = vi.fn();

    render(
      <ChatPane
        messages={baseMessages}
        onCreateBranch={onCreateBranch}
        onCreateNote={vi.fn()}
        onRetryMessage={vi.fn()}
        onSendMessage={vi.fn()}
      />
    );

    const userText = screen.getByText("如何评估提示词质量？");
    const textNode = userText.firstChild as Node;
    const userMessage = screen.getByTestId("chat-message-m-user-1");

    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      toString: () => "评估提示词质量",
      anchorNode: textNode,
      focusNode: textNode,
      getRangeAt: () => ({
        startContainer: textNode,
        endContainer: textNode,
        commonAncestorContainer: textNode,
        getBoundingClientRect: () => ({ left: 160, width: 80, top: 180 }),
        intersectsNode: (node: Node) => node === userMessage
      }),
      removeAllRanges: vi.fn()
    } as unknown as Selection);

    fireEvent.mouseUp(screen.getByTestId("chat-scroll-area"));
    fireEvent.click(screen.getByRole("button", { name: "Create branch from selection" }));

    expect(onCreateBranch).toHaveBeenCalledWith({
      mode: "selection",
      sourceMessageId: "m-user-1",
      sourceNodeId: "root",
      selectedText: "评估提示词质量"
    });
  });

  it("submits user draft on Enter", () => {
    const onSendMessage = vi.fn();

    render(
      <ChatPane
        messages={baseMessages}
        onCreateBranch={vi.fn()}
        onCreateNote={vi.fn()}
        onRetryMessage={vi.fn()}
        onSendMessage={onSendMessage}
      />
    );

    const input = screen.getByLabelText("聊天输入");
    fireEvent.change(input, { target: { value: "请给一个执行清单" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSendMessage).toHaveBeenCalledWith("请给一个执行清单");
  });

  it("opens tools popover from plus button", () => {
    render(
      <ChatPane
        messages={baseMessages}
        onCreateBranch={vi.fn()}
        onCreateNote={vi.fn()}
        onRetryMessage={vi.fn()}
        onSendMessage={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "打开附件菜单" }));

    expect(screen.getByRole("button", { name: /添加照片和文件/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建图片" })).toBeInTheDocument();
  });

  it("supports retry controls and retry callback", () => {
    const onRetryMessage = vi.fn();

    render(
      <ChatPane
        messages={[
          ...baseMessages,
          {
            id: "m-assistant-2",
            nodeId: "root",
            role: "assistant",
            content: "也可以先固定输出模板，减少波动。",
            replyToMessageId: "m-user-1",
            retryIndex: 2
          }
        ]}
        onCreateBranch={vi.fn()}
        onCreateNote={vi.fn()}
        onRetryMessage={onRetryMessage}
        onSendMessage={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetryMessage).toHaveBeenCalledWith({
      sourceNodeId: "root",
      sourceMessageId: "m-assistant-2",
      replyToMessageId: "m-user-1"
    });

    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show previous retry" }));
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show next retry" }));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("creates clone branch from assistant action button", () => {
    const onCreateBranch = vi.fn();

    render(
      <ChatPane
        messages={baseMessages}
        onCreateBranch={onCreateBranch}
        onCreateNote={vi.fn()}
        onRetryMessage={vi.fn()}
        onSendMessage={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Branch" }));

    expect(onCreateBranch).toHaveBeenCalledWith({
      mode: "clone",
      sourceMessageId: "m-assistant-1",
      sourceNodeId: "root"
    });
  });

  it("creates note from assistant action button", () => {
    const onCreateNote = vi.fn();

    render(
      <ChatPane
        messages={baseMessages}
        onCreateBranch={vi.fn()}
        onCreateNote={onCreateNote}
        onRetryMessage={vi.fn()}
        onSendMessage={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Take Note" }));
    expect(onCreateNote).toHaveBeenCalledWith({
      mode: "message",
      sourceMessageId: "m-assistant-1",
      sourceNodeId: "root",
      content: "可以先定义评估维度，再做对照实验。"
    });
  });
});
