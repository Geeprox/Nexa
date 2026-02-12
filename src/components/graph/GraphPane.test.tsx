import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GraphNode, GraphPane } from "./GraphPane";

const nodes: GraphNode[] = [
  {
    id: "root",
    parentId: null,
    title: "起点问题",
    createdAt: new Date().toISOString(),
    position: { x: 20, y: 100 }
  },
  {
    id: "node-1",
    parentId: "root",
    title: "比较框架",
    createdAt: new Date().toISOString(),
    position: { x: 280, y: 120 }
  }
];

const messagesByNode = {
  root: [
    { id: "u-1", nodeId: "root", role: "user" as const, content: "如何开始比较？" },
    {
      id: "a-1",
      nodeId: "root",
      role: "assistant" as const,
      content: "先定义比较维度并建立模板。",
      replyToMessageId: "u-1",
      retryIndex: 1
    }
  ],
  "node-1": [
    { id: "u-2", nodeId: "node-1", role: "user" as const, content: "给我分支中的执行步骤" },
    {
      id: "a-2",
      nodeId: "node-1",
      role: "assistant" as const,
      content: "可以从样本集、指标、复盘三个阶段推进。",
      replyToMessageId: "u-2",
      retryIndex: 1
    }
  ]
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GraphPane", () => {
  it("renders canvas and supports node focus", () => {
    const onSelectNode = vi.fn();
    const onMoveNode = vi.fn();

    render(
      <GraphPane
        nodes={nodes}
        messagesByNode={messagesByNode}
        activeNodeId="root"
        onSelectNode={onSelectNode}
        onMoveNode={onMoveNode}
        onCreateBranch={vi.fn()}
        onCreateNote={vi.fn()}
      />
    );

    expect(screen.getByTestId("graph-canvas")).toBeInTheDocument();
    expect(screen.getByText("如何开始比较？")).toBeInTheDocument();
    expect(screen.getByText("先定义比较维度并建立模板。")).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId("graph-node-node-1")[0]);
    expect(onSelectNode).toHaveBeenCalledWith("node-1");
  });

  it("exposes focus-visible class hooks for keyboard focus", () => {
    render(
      <GraphPane
        nodes={nodes}
        messagesByNode={messagesByNode}
        activeNodeId="root"
        onSelectNode={vi.fn()}
        onMoveNode={vi.fn()}
        onCreateBranch={vi.fn()}
        onCreateNote={vi.fn()}
      />
    );

    expect(screen.getAllByTestId("graph-node-root")[0].className).toContain("focus-visible:ring-2");
    expect(screen.getByTestId("graph-canvas").className).toContain("focus-visible:ring-2");
  });

  it("supports keyboard navigation on graph canvas", () => {
    const onSelectNode = vi.fn();

    render(
      <GraphPane
        nodes={nodes}
        messagesByNode={messagesByNode}
        activeNodeId="root"
        onSelectNode={onSelectNode}
        onMoveNode={vi.fn()}
        onCreateBranch={vi.fn()}
        onCreateNote={vi.fn()}
      />
    );

    fireEvent.keyDown(screen.getByTestId("graph-canvas"), { key: "ArrowRight" });
    expect(onSelectNode).toHaveBeenCalledWith("node-1");
  });

  it("opens branch action from selected text in graph block", () => {
    const onCreateBranch = vi.fn();

    render(
      <GraphPane
        nodes={nodes}
        messagesByNode={messagesByNode}
        activeNodeId="root"
        onSelectNode={vi.fn()}
        onMoveNode={vi.fn()}
        onCreateBranch={onCreateBranch}
        onCreateNote={vi.fn()}
      />
    );

    const answerText = screen.getByText("先定义比较维度并建立模板。");
    const textNode = answerText.firstChild as Node;
    const answerContainer = answerText.closest("[data-graph-message-id]") as HTMLElement;

    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      toString: () => "比较维度",
      anchorNode: textNode,
      focusNode: textNode,
      getRangeAt: () => ({
        startContainer: textNode,
        endContainer: textNode,
        commonAncestorContainer: textNode,
        getBoundingClientRect: () => ({ left: 150, width: 60, top: 160 }),
        intersectsNode: (node: Node) => node === answerContainer
      }),
      removeAllRanges: vi.fn()
    } as unknown as Selection);

    fireEvent.mouseUp(screen.getByTestId("graph-canvas"));
    fireEvent.click(screen.getByRole("button", { name: "Create branch from selection" }));

    expect(onCreateBranch).toHaveBeenCalledWith({
      mode: "selection",
      sourceMessageId: "a-1",
      sourceNodeId: "root",
      selectedText: "比较维度"
    });
  });
});
