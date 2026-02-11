import { describe, it, expect } from "vitest";
import { autoTagEntity, toTaggingRecords } from "./index";

describe("toTaggingRecords", () => {
  it("creates auto tagging records with confidence", () => {
    const records = toTaggingRecords({
      tagIds: ["tag-1", "tag-2"],
      entityId: "entity-1",
      entityType: "conversation",
      confidence: 0.8
    });

    expect(records).toHaveLength(2);
    expect(records[0].entityId).toBe("entity-1");
    expect(records[0].source).toBe("auto");
    expect(records[0].confidence).toBe(0.8);
  });

  it("defaults confidence to null when not provided", () => {
    const records = toTaggingRecords({
      tagIds: ["tag-1"],
      entityId: "entity-2",
      entityType: "note"
    });

    expect(records[0].confidence).toBeNull();
  });
});

describe("autoTagEntity", () => {
  it("extracts tags from matched content rules", async () => {
    const result = await autoTagEntity({
      entityId: "entity-3",
      entityType: "conversation",
      content: "可以先定义比较框架，再抽取数据变量并归纳结论。"
    });

    expect(result.tagNames).toEqual(["对比分析", "方法论", "数据抽取", "结论归纳"]);
    expect(result.confidence).toBe(0.78);
  });

  it("uses fallback tag when no rule matches", async () => {
    const result = await autoTagEntity({
      entityId: "entity-4",
      entityType: "note",
      content: "misc content"
    });

    expect(result.tagNames).toEqual(["主题探索"]);
    expect(result.confidence).toBe(0.42);
  });
});
