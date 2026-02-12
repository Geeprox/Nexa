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
        activeNodeTitle="起点问题"
        messages={baseMessages}
        onCreateBranch={onCreateBranch}
        onRetryMessage={vi.fn()}
        onSendMessage={vi.fn()}
      />
    );

    const assistantText = screen.getByText("可以先定义评估维度，再做对照实验。");
    const textNode = assistantText.firstChild;
    expect(textNode).toBeTruthy();

    const removeAllRanges = vi.fn();
    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      toString: () => "评估维度",
      anchorNode: textNode,
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ left: 120, width: 60, top: 150 })
      }),
      removeAllRanges
    } as unknown as Selection);

    fireEvent.mouseUp(screen.getByTestId("chat-scroll-area"));
    fireEvent.click(screen.getByRole("button", { name: /分叉/ }));

    expect(onCreateBranch).toHaveBeenCalledWith({
      mode: "selection",
      sourceMessageId: "m-assistant-1",
      sourceNodeId: "root",
      selectedText: "评估维度"
    });
    expect(removeAllRanges).toHaveBeenCalledTimes(1);
  });

  it("submits user draft on Enter", () => {
    const onSendMessage = vi.fn();

    render(
      <ChatPane
        activeNodeTitle="起点问题"
        messages={baseMessages}
        onCreateBranch={vi.fn()}
        onRetryMessage={vi.fn()}
        onSendMessage={onSendMessage}
      />
    );

    const textarea = screen.getByLabelText("聊天输入");
    fireEvent.change(textarea, { target: { value: "请给一个执行清单" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(onSendMessage).toHaveBeenCalledWith("请给一个执行清单");
  });

  it("supports retry controls and retry callback", () => {
    const onRetryMessage = vi.fn();

    render(
      <ChatPane
        activeNodeTitle="起点问题"
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
        onRetryMessage={onRetryMessage}
        onSendMessage={vi.fn()}
      />
    );

    expect(screen.getByText("Copy")).toBeInTheDocument();
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
        activeNodeTitle="起点问题"
        messages={baseMessages}
        onCreateBranch={onCreateBranch}
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
});
