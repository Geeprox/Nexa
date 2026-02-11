import { describe, it, expect, vi } from "vitest";
import { JobQueue } from "./queue";

describe("JobQueue", () => {
  it("enqueues jobs", () => {
    const queue = new JobQueue();
    const job = queue.enqueue({
      type: "auto_tag_entity",
      payload: { id: "x" }
    });

    expect(job.status).toBe("queued");
    expect(job.type).toBe("auto_tag_entity");
  });

  it("processes job with registered handler", async () => {
    const queue = new JobQueue();
    const handler = vi.fn(async () => undefined);
    queue.registerHandler("auto_tag_entity", handler);

    const job = queue.enqueue({
      type: "auto_tag_entity",
      payload: { id: "x" }
    });
    const done = await queue.waitFor(job.id);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(done?.status).toBe("completed");
    expect(queue.listJobs("completed")).toHaveLength(1);
  });

  it("marks failed when handler throws", async () => {
    const queue = new JobQueue();
    queue.registerHandler("auto_tag_entity", async () => {
      throw new Error("boom");
    });

    const job = queue.enqueue({
      type: "auto_tag_entity",
      payload: { id: "x" }
    });
    const done = await queue.waitFor(job.id);

    expect(done?.status).toBe("failed");
  });

  it("notifies job updates on status transitions", async () => {
    const onJobUpdate = vi.fn();
    const queue = new JobQueue({ onJobUpdate });
    queue.registerHandler("auto_tag_entity", async () => undefined);

    const job = queue.enqueue({
      type: "auto_tag_entity",
      payload: { id: "x" }
    });
    await queue.waitFor(job.id);

    expect(onJobUpdate).toHaveBeenCalled();
    const statuses = onJobUpdate.mock.calls.map((call) => call[0].status);
    expect(statuses).toContain("queued");
    expect(statuses).toContain("running");
    expect(statuses).toContain("completed");
  });

  it("continues processing when update listener fails", async () => {
    const queue = new JobQueue({
      onJobUpdate: async () => {
        throw new Error("listener down");
      }
    });
    queue.registerHandler("auto_tag_entity", async () => undefined);

    const job = queue.enqueue({
      type: "auto_tag_entity",
      payload: { id: "x" }
    });
    const done = await queue.waitFor(job.id);

    expect(done?.status).toBe("completed");
  });
});
