import type { DatabaseAdapter } from "./index";
import type { EntityType, Tag, Tagging, TagSource } from "./types";

export interface EntityTagRecord {
  name: string;
  source: TagSource;
  confidence: number | null;
}

function normalizeTagName(name: string) {
  return name.trim().toLowerCase();
}

function pickPreferredTag(
  current: EntityTagRecord | undefined,
  candidate: EntityTagRecord
): EntityTagRecord {
  if (!current) {
    return candidate;
  }
  if (current.source === "manual") {
    return current;
  }
  return candidate.source === "manual" ? candidate : current;
}

function dedupeRecords(records: EntityTagRecord[]): EntityTagRecord[] {
  const byNormalizedName = new Map<string, EntityTagRecord>();
  for (const record of records) {
    const normalizedName = normalizeTagName(record.name);
    if (!normalizedName) {
      continue;
    }

    const candidate: EntityTagRecord = {
      name: record.name.trim(),
      source: record.source,
      confidence: record.source === "manual" ? null : record.confidence ?? null
    };
    byNormalizedName.set(
      normalizedName,
      pickPreferredTag(byNormalizedName.get(normalizedName), candidate)
    );
  }

  return [...byNormalizedName.values()];
}

function toTagKey(source: TagSource, tagId: string) {
  return `${source}:${tagId}`;
}

export class TagRepository {
  constructor(private readonly adapter: DatabaseAdapter) {}

  async loadEntityTags(entityType: EntityType, entityId: string): Promise<EntityTagRecord[]> {
    const [tags, taggings] = await Promise.all([
      this.adapter.listTags(),
      this.adapter.listTaggingsByEntity(entityType, entityId)
    ]);
    const tagById = new Map(tags.map((tag) => [tag.id, tag]));

    const records: EntityTagRecord[] = [];
    for (const tagging of taggings) {
      const tag = tagById.get(tagging.tagId);
      if (!tag) {
        continue;
      }

      records.push({
        name: tag.name,
        source: tagging.source,
        confidence: tagging.source === "manual" ? null : tagging.confidence
      });
    }

    return dedupeRecords(records);
  }

  async syncEntityTags(
    entityType: EntityType,
    entityId: string,
    records: EntityTagRecord[]
  ): Promise<void> {
    const deduped = dedupeRecords(records);
    const [existingTags, existingTaggings] = await Promise.all([
      this.adapter.listTags(),
      this.adapter.listTaggingsByEntity(entityType, entityId)
    ]);

    const existingTagByName = new Map(existingTags.map((tag) => [normalizeTagName(tag.name), tag]));
    const desiredTaggings: Array<{
      tagId: string;
      source: TagSource;
      confidence: number | null;
    }> = [];

    for (const record of deduped) {
      const normalizedName = normalizeTagName(record.name);
      if (!normalizedName) {
        continue;
      }

      let tag = existingTagByName.get(normalizedName);
      if (!tag) {
        tag = {
          id: crypto.randomUUID(),
          name: record.name.trim(),
          createdAt: new Date().toISOString()
        } satisfies Tag;
        await this.adapter.saveTag(tag);
        existingTagByName.set(normalizedName, tag);
      }

      desiredTaggings.push({
        tagId: tag.id,
        source: record.source,
        confidence: record.source === "manual" ? null : record.confidence ?? null
      });
    }

    const existingByKey = new Map(existingTaggings.map((tagging) => [toTagKey(tagging.source, tagging.tagId), tagging]));
    const desiredKeys = new Set(desiredTaggings.map((tagging) => toTagKey(tagging.source, tagging.tagId)));

    for (const tagging of existingTaggings) {
      const key = toTagKey(tagging.source, tagging.tagId);
      if (desiredKeys.has(key)) {
        continue;
      }
      await this.adapter.deleteTagging(tagging.id);
    }

    for (const desired of desiredTaggings) {
      const key = toTagKey(desired.source, desired.tagId);
      const existing = existingByKey.get(key);
      const nextTagging: Tagging = {
        id: existing?.id ?? crypto.randomUUID(),
        tagId: desired.tagId,
        entityType,
        entityId,
        source: desired.source,
        confidence: desired.confidence,
        createdAt: existing?.createdAt ?? new Date().toISOString()
      };

      if (existing && existing.confidence === desired.confidence) {
        continue;
      }
      await this.adapter.saveTagging(nextTagging);
    }
  }
}
