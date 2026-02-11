export type JobStatus = "queued" | "running" | "failed" | "completed";

export interface JobPayload {
  type: string;
  payload: Record<string, unknown>;
}

export interface JobRecord extends JobPayload {
  id: string;
  status: JobStatus;
  createdAt: string;
}

export type JobHandler = (job: JobRecord) => Promise<void>;
export type JobUpdateListener = (job: JobRecord) => void | Promise<void>;

interface JobQueueOptions {
  onJobUpdate?: JobUpdateListener;
}

export class JobQueue {
  private jobs: JobRecord[] = [];
  private handlers = new Map<string, JobHandler>();
  private waiters = new Map<string, (job: JobRecord) => void>();
  private running = false;

  constructor(private readonly options?: JobQueueOptions) {}

  enqueue(job: JobPayload) {
    const record: JobRecord = {
      ...job,
      id: crypto.randomUUID(),
      status: "queued",
      createdAt: new Date().toISOString()
    };
    const queuedSnapshot = this.snapshot(record);
    this.jobs.push(record);
    void this.emit(record);
    queueMicrotask(() => {
      void this.pump();
    });
    return queuedSnapshot;
  }

  registerHandler(type: string, handler: JobHandler) {
    this.handlers.set(type, handler);
  }

  listJobs(status?: JobStatus) {
    const jobs = status
      ? this.jobs.filter((job) => job.status === status)
      : this.jobs;
    return jobs.map((job) => this.snapshot(job));
  }

  private snapshot(job: JobRecord): JobRecord {
    return {
      ...job,
      payload: { ...job.payload }
    };
  }

  async waitFor(jobId: string) {
    const current = this.jobs.find((job) => job.id === jobId);
    if (!current) {
      return null;
    }
    if (current.status === "completed" || current.status === "failed") {
      return this.snapshot(current);
    }

    return new Promise<JobRecord>((resolve) => {
      this.waiters.set(jobId, resolve);
    });
  }

  private async emit(job: JobRecord) {
    try {
      await this.options?.onJobUpdate?.(this.snapshot(job));
    } catch {
      // Persistence or observer failures should not block job execution.
    }
  }

  private async updateStatus(job: JobRecord, status: JobStatus) {
    job.status = status;
    await this.emit(job);

    if (status === "completed" || status === "failed") {
      this.waiters.get(job.id)?.(this.snapshot(job));
      this.waiters.delete(job.id);
    }
  }

  private async pump() {
    if (this.running) {
      return;
    }
    this.running = true;

    try {
      while (true) {
        const next = this.jobs.find((job) => job.status === "queued");
        if (!next) {
          return;
        }

        await this.updateStatus(next, "running");
        const handler = this.handlers.get(next.type);
        if (!handler) {
          await this.updateStatus(next, "failed");
          continue;
        }

        try {
          await handler(this.snapshot(next));
          await this.updateStatus(next, "completed");
        } catch {
          await this.updateStatus(next, "failed");
        }
      }
    } finally {
      this.running = false;
    }
  }
}
