import { describe, expect, it } from "vitest";
import { searchConversationMessages } from "./conversationSearch";

const nodes = [
  { id: "root", title: "起点问题" },
  { id: "branch-a", title: "方法分支" }
];

const messagesByNode = {
  root: [
    {
      id: "m1",
      nodeId: "root",
      role: "user" as const,
      content: "如何进行文献对比分析？"
    },
    {
      id: "m2",
      nodeId: "root",
      role: "assistant" as const,
      content: "你可以先建立比较维度，然后抽取关键变量。"
    }
  ],
  "branch-a": [
    {
      id: "m3",
      nodeId: "branch-a",
      role: "assistant" as const,
      content: "可以按方法、数据、结论三个层面逐步对照。"
    }
  ]
};

describe("searchConversationMessages", () => {
  it("returns matching message snippets by node order", () => {
    const results = searchConversationMessages({
      query: "对比",
      nodes,
      messagesByNode
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      nodeId: "root",
      messageId: "m1",
      nodeTitle: "起点问题"
    });
    expect(results[0].snippet).toContain("文献对比");
  });

  it("returns empty results for empty query", () => {
    const results = searchConversationMessages({
      query: "  ",
      nodes,
      messagesByNode
    });

    expect(results).toEqual([]);
  });

  it("limits returned results", () => {
    const results = searchConversationMessages({
      query: "可",
      nodes,
      messagesByNode,
      limit: 1
    });

    expect(results).toHaveLength(1);
  });
});
