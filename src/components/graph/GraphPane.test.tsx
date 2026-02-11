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
        activeNodeId="root"
        onSelectNode={onSelectNode}
        onMoveNode={onMoveNode}
      />
    );

    expect(screen.getByText("对话图谱")).toBeInTheDocument();
    expect(screen.getByTestId("graph-canvas")).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId("graph-node-node-1")[0]);
    expect(onSelectNode).toHaveBeenCalledWith("node-1");
  });

  it("exposes focus-visible class hooks for keyboard focus", () => {
    render(
      <GraphPane
        nodes={nodes}
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
