import type { EntityType } from "@/lib/db/types";
import { TagRepository, type EntityTagRecord } from "@/lib/db/tagRepository";
import type { AutoTagResult } from "@/lib/tagging";
import type { JobRecord } from "./queue";
import { JobQueue } from "./queue";

export interface AutoTagJobPayload {
  entityId: string;
  entityType: EntityType;
  content: string;
  dismissedAutoTags?: string[];
}

export type AutoTagger = (input: {
  entityId: string;
  entityType: EntityType;
  content: string;
}) => Promise<AutoTagResult>;

function normalizeTagName(name: string) {
  return name.trim().toLowerCase();
}

function isAutoTagJobPayload(value: unknown): value is AutoTagJobPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const payload = value as Record<string, unknown>;
  const dismissedAutoTags = payload.dismissedAutoTags;
  return (
    typeof payload.entityId === "string" &&
    (payload.entityType === "conversation" || payload.entityType === "note") &&
    typeof payload.content === "string" &&
    (dismissedAutoTags === undefined ||
      (Array.isArray(dismissedAutoTags) &&
        dismissedAutoTags.every((item) => typeof item === "string")))
  );
}

export class AutoTagOrchestrator {
  private resultByJobId = new Map<string, EntityTagRecord[]>();

  constructor(
    private readonly queue: JobQueue,
    private readonly tagRepository: TagRepository,
    private readonly autoTagger: AutoTagger
  ) {
    this.queue.registerHandler("auto_tag_entity", (job) => this.handleAutoTagJob(job));
  }

  async enqueueAndWait(payload: AutoTagJobPayload) {
    const job = this.queue.enqueue({
      type: "auto_tag_entity",
      payload: {
        entityId: payload.entityId,
        entityType: payload.entityType,
        content: payload.content,
        dismissedAutoTags: payload.dismissedAutoTags
      }
    });
    const completed = await this.queue.waitFor(job.id);
    if (!completed || completed.status !== "completed") {
      throw new Error("auto tag job failed");
    }

    const result = this.resultByJobId.get(job.id) ?? [];
    this.resultByJobId.delete(job.id);
    return result;
  }

  private async handleAutoTagJob(job: JobRecord) {
    if (!isAutoTagJobPayload(job.payload)) {
      throw new Error("invalid auto tag payload");
    }

    const payload = job.payload;
    const existingTags = await this.tagRepository.loadEntityTags(payload.entityType, payload.entityId);
    const manualTags = existingTags.filter((item) => item.source === "manual");
    const autoTagResult = await this.autoTagger({
      entityId: payload.entityId,
      entityType: payload.entityType,
      content: payload.content
    });

    const dismissedSet = new Set(
      (payload.dismissedAutoTags ?? []).map((tag) => normalizeTagName(tag))
    );
    const autoTags = [...new Set(autoTagResult.tagNames.map((name) => name.trim()))]
      .filter((name) => name.length > 0)
      .filter((name) => !dismissedSet.has(normalizeTagName(name)))
      .map<EntityTagRecord>((name) => ({
        name,
        source: "auto",
        confidence: autoTagResult.confidence
      }));

    await this.tagRepository.syncEntityTags(payload.entityType, payload.entityId, [
      ...manualTags,
      ...autoTags
    ]);

    this.resultByJobId.set(
      job.id,
      await this.tagRepository.loadEntityTags(payload.entityType, payload.entityId)
    );
  }
}
