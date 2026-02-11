import type { Tagging } from "@/lib/db/types";

export interface AutoTagResult {
  tagNames: string[];
  confidence: number;
}

const TAG_RULES: Array<{ tag: string; pattern: RegExp }> = [
  { tag: "文献研究", pattern: /(文献|论文|研究)/i },
  { tag: "对比分析", pattern: /(对比|比较|矩阵)/i },
  { tag: "方法论", pattern: /(方法|框架|流程)/i },
  { tag: "数据抽取", pattern: /(数据|变量|指标)/i },
  { tag: "结论归纳", pattern: /(结论|总结|归纳)/i }
];

export async function autoTagEntity(input: {
  entityId: string;
  entityType: "conversation" | "note";
  content: string;
}): Promise<AutoTagResult> {
  const normalized = input.content.trim();
  if (!normalized) {
    return {
      tagNames: [],
      confidence: 0
    };
  }

  const matches = TAG_RULES.filter((rule) => rule.pattern.test(normalized))
    .map((rule) => rule.tag)
    .slice(0, 5);

  const uniqueTagNames = [...new Set(matches)];
  return {
    tagNames: uniqueTagNames.length > 0 ? uniqueTagNames : ["主题探索"],
    confidence: uniqueTagNames.length > 0 ? 0.78 : 0.42
  };
}

export function toTaggingRecords(input: {
  tagIds: string[];
  entityId: string;
  entityType: "conversation" | "note";
  confidence?: number;
}): Tagging[] {
  const now = new Date().toISOString();
  return input.tagIds.map((tagId) => ({
    id: crypto.randomUUID(),
    tagId,
    entityId: input.entityId,
    entityType: input.entityType,
    source: "auto",
    confidence: input.confidence ?? null,
    createdAt: now
  }));
}
