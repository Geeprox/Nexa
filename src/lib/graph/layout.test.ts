import { describe, expect, it } from "vitest";
import {
  estimateGraphNodeHeight,
  resolveNonOverlappingPosition
} from "./layout";

describe("graph layout", () => {
  it("estimates a bounded node height", () => {
    expect(estimateGraphNodeHeight([])).toBeGreaterThanOrEqual(220);
    expect(estimateGraphNodeHeight([])).toBeLessThanOrEqual(720);
  });

  it("pushes candidate node down when overlapping", () => {
    const nodes = [
      { id: "node-a", position: { x: 40, y: 160 } },
      { id: "node-b", position: { x: 40, y: 160 } }
    ];

    const resolved = resolveNonOverlappingPosition({
      nodes,
      messagesByNode: {
        "node-a": [{ role: "user" as const, content: "Q" }, { role: "assistant" as const, content: "A" }],
        "node-b": [{ role: "user" as const, content: "Q2" }]
      },
      candidateNodeId: "node-b",
      candidatePosition: { x: 40, y: 160 },
      padding: 36
    });

    expect(resolved.x).toBe(40);
    expect(resolved.y).toBeGreaterThan(160);
  });
});
