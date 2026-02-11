import { describe, expect, it } from "vitest";
import { InMemoryAdapter } from "./index";
import { TagRepository } from "./tagRepository";

describe("TagRepository", () => {
  it("loads entity tags and prefers manual tag over auto tag with same name", async () => {
    const adapter = new InMemoryAdapter();
    const repository = new TagRepository(adapter);

    await adapter.saveTag({
      id: "tag-1",
      name: "对比分析",
      createdAt: "2025-01-01T00:00:00.000Z"
    });
    await adapter.saveTagging({
      id: "tagging-auto",
      tagId: "tag-1",
      entityType: "conversation",
      entityId: "c1",
      source: "auto",
      confidence: 0.8,
      createdAt: "2025-01-01T00:00:01.000Z"
    });
    await adapter.saveTagging({
      id: "tagging-manual",
      tagId: "tag-1",
      entityType: "conversation",
      entityId: "c1",
      source: "manual",
      confidence: null,
      createdAt: "2025-01-01T00:00:02.000Z"
    });

    const records = await repository.loadEntityTags("conversation", "c1");
    expect(records).toEqual([
      {
        name: "对比分析",
        source: "manual",
        confidence: null
      }
    ]);
  });

  it("creates missing tags and taggings when syncing entity tags", async () => {
    const adapter = new InMemoryAdapter();
    const repository = new TagRepository(adapter);

    await repository.syncEntityTags("conversation", "c1", [
      {
        name: "研究方法",
        source: "manual",
        confidence: null
      },
      {
        name: "方法论",
        source: "auto",
        confidence: 0.72
      }
    ]);

    const tags = await adapter.listTags();
    const taggings = await adapter.listTaggingsByEntity("conversation", "c1");

    expect(tags.map((item) => item.name).sort()).toEqual(["方法论", "研究方法"]);
    expect(taggings).toHaveLength(2);
    expect(taggings.find((item) => item.source === "manual")?.confidence).toBeNull();
    expect(taggings.find((item) => item.source === "auto")?.confidence).toBe(0.72);
  });

  it("removes stale taggings when syncing updated records", async () => {
    const adapter = new InMemoryAdapter();
    const repository = new TagRepository(adapter);

    await repository.syncEntityTags("conversation", "c1", [
      {
        name: "研究方法",
        source: "manual",
        confidence: null
      },
      {
        name: "对比分析",
        source: "auto",
        confidence: 0.7
      }
    ]);
    await repository.syncEntityTags("conversation", "c1", [
      {
        name: "研究方法",
        source: "manual",
        confidence: null
      }
    ]);

    const taggings = await adapter.listTaggingsByEntity("conversation", "c1");
    expect(taggings).toHaveLength(1);
    expect(taggings[0].source).toBe("manual");
  });
});
