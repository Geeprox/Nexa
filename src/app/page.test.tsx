import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONVERSATION_SNAPSHOT_KEY } from "@/lib/session/conversationSnapshot";
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

    const textarea = screen.getByLabelText("聊天输入");
    fireEvent.change(textarea, { target: { value: "给我一个可执行的研究流程" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(screen.getByText("给我一个可执行的研究流程")).toBeInTheDocument();

    vi.advanceTimersByTime(5000);
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

    expect(screen.getByText("对话图谱")).toBeInTheDocument();
    expect(screen.queryByLabelText("聊天输入")).not.toBeInTheDocument();
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
      toString: () => "固定字段",
      anchorNode: textNode,
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ left: 120, width: 60, top: 150 })
      }),
      removeAllRanges
    } as unknown as Selection);

    fireEvent.mouseUp(screen.getByTestId("chat-scroll-area"));
    fireEvent.click(screen.getByRole("button", { name: /分叉/ }));

    expect(removeAllRanges).toHaveBeenCalledTimes(1);
    expect(screen.getByText("对话图谱")).toBeInTheDocument();

    const rawSnapshot = window.localStorage.getItem(CONVERSATION_SNAPSHOT_KEY);
    expect(rawSnapshot).not.toBeNull();

    const snapshot = JSON.parse(rawSnapshot ?? "{}");
    const activeMessages = snapshot.messagesByNode[snapshot.activeNodeId] as Array<{ content: string }>;

    expect(activeMessages.at(-1)?.content).toContain("固定字段");
    expect(activeMessages.at(-1)?.content).toContain("最高优先级上下文");
  });
});
