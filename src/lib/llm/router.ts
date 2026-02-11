import type { ModelProfile, ModelTier } from "./types";

export type TaskType =
  | "chat_stream"
  | "summarize_node"
  | "summarize_conversation"
  | "background_index"
  | "auto_tag_entity";

export const defaultTaskRouting: Record<TaskType, ModelTier> = {
  chat_stream: "high",
  summarize_node: "low",
  summarize_conversation: "mid",
  background_index: "low",
  auto_tag_entity: "low"
};

export function resolveModelForTask(
  taskType: TaskType,
  profiles: ModelProfile[]
): ModelProfile | null {
  const tier = defaultTaskRouting[taskType];
  return profiles.find((profile) => profile.tier === tier) ?? null;
}
