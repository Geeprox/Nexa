import { describe, it, expect } from "vitest";
import { resolveModelForTask } from "./router";
import type { ModelProfile } from "./types";

describe("resolveModelForTask", () => {
  const profiles: ModelProfile[] = [
    {
      tier: "high",
      provider: "openai",
      baseUrl: "https://api.example.com",
      apiKeyRef: "key-high",
      modelId: "gpt-high"
    },
    {
      tier: "mid",
      provider: "openai",
      baseUrl: "https://api.example.com",
      apiKeyRef: "key-mid",
      modelId: "gpt-mid"
    },
    {
      tier: "low",
      provider: "openai",
      baseUrl: "https://api.example.com",
      apiKeyRef: "key-low",
      modelId: "gpt-low"
    }
  ];

  it("returns the configured tier for a task", () => {
    const model = resolveModelForTask("auto_tag_entity", profiles);
    expect(model?.tier).toBe("low");
  });

  it("returns null when no profile matches", () => {
    const model = resolveModelForTask("summarize_conversation", profiles.slice(0, 1));
    expect(model).toBeNull();
  });
});
