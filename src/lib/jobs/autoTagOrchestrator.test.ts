import { describe, expect, it } from "vitest";
import { InMemoryAdapter } from "@/lib/db";
import { TagRepository } from "@/lib/db/tagRepository";
import { JobQueue } from "./queue";
import { AutoTagOrchestrator } from "./autoTagOrchestrator";

describe("AutoTagOrchestrator", () => {
  it("keeps manual tags and appends auto tags from job result", async () => {
    const adapter = new InMemoryAdapter();
    const tagRepository = new TagRepository(adapter);
    await tagRepository.syncEntityTags("conversation", "c1", [
      {
        name: "研究方法",
        source: "manual",
        confidence: null
      }
    ]);

    const queue = new JobQueue({
      onJobUpdate: async (job) => {
        await adapter.enqueueJob({
          id: job.id,
          type: job.type,
          payload: JSON.stringify(job.payload),
          status: job.status,
          createdAt: job.createdAt
        });
      }
    });

    const orchestrator = new AutoTagOrchestrator(queue, tagRepository, async () => ({
      tagNames: ["对比分析", "研究方法"],
      confidence: 0.78
    }));

    const tags = await orchestrator.enqueueAndWait({
      entityId: "c1",
      entityType: "conversation",
      content: "方法对比"
    });

    expect(tags).toEqual([
      {
        name: "研究方法",
        source: "manual",
        confidence: null
      },
      {
        name: "对比分析",
        source: "auto",
        confidence: 0.78
      }
    ]);

    const jobs = await adapter.listJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].status).toBe("completed");
  });

  it("filters dismissed auto tags", async () => {
    const adapter = new InMemoryAdapter();
    const queue = new JobQueue();
    const orchestrator = new AutoTagOrchestrator(
      queue,
      new TagRepository(adapter),
      async () => ({
        tagNames: ["对比分析", "方法论"],
        confidence: 0.6
      })
    );

    const tags = await orchestrator.enqueueAndWait({
      entityId: "c1",
      entityType: "conversation",
      content: "对比方法",
      dismissedAutoTags: ["对比分析"]
    });

    expect(tags.map((item) => item.name)).toEqual(["方法论"]);
  });

  it("fails job for invalid payload shape", async () => {
    const queue = new JobQueue();
    const orchestrator = new AutoTagOrchestrator(
      queue,
      new TagRepository(new InMemoryAdapter()),
      async () => ({
        tagNames: ["主题探索"],
        confidence: 0.4
      })
    );

    await expect(
      orchestrator.enqueueAndWait({
        entityId: "c1",
        entityType: "conversation",
        content: "",
        dismissedAutoTags: [123 as unknown as string]
      })
    ).rejects.toThrow("auto tag job failed");
  });
});
