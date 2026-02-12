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
    { role: "user" as const, content: "如何开始比较？" },
    { role: "assistant" as const, content: "先定义比较维度并建立模板。" }
  ],
  "node-1": [
    { role: "user" as const, content: "给我分支中的执行步骤" },
    { role: "assistant" as const, content: "可以从样本集、指标、复盘三个阶段推进。" }
  ]
};

afterEach(() => {
  cleanup();
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
      />
    );

    expect(screen.getByTestId("graph-canvas")).toBeInTheDocument();
    expect(screen.getAllByText(/Q:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/A:/).length).toBeGreaterThan(0);

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
      />
    );

    fireEvent.keyDown(screen.getByTestId("graph-canvas"), { key: "ArrowRight" });
    expect(onSelectNode).toHaveBeenCalledWith("node-1");
  });

  it("supports home/end and reverse navigation on graph canvas", () => {
    const onSelectNode = vi.fn();

    render(
      <GraphPane
        nodes={nodes}
        messagesByNode={messagesByNode}
        activeNodeId="node-1"
        onSelectNode={onSelectNode}
        onMoveNode={vi.fn()}
      />
    );

    const canvas = screen.getByTestId("graph-canvas");
    fireEvent.keyDown(canvas, { key: "ArrowLeft" });
    fireEvent.keyDown(canvas, { key: "End" });
    fireEvent.keyDown(canvas, { key: "Home" });

    expect(onSelectNode).toHaveBeenCalledWith("root");
    expect(onSelectNode).toHaveBeenCalledWith("node-1");
  });
});
