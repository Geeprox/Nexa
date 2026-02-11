import { describe, it, expect } from "vitest";
import { OpenAIProvider } from "./openai";

const provider = new OpenAIProvider();

describe("OpenAIProvider", () => {
  it("streams a stub response", async () => {
    const stream = provider.streamChat({
      model: {
        tier: "high",
        provider: "openai",
        baseUrl: "https://api.example.com",
        apiKeyRef: "key",
        modelId: "gpt"
      },
      messages: [{ role: "user", content: "hello" }]
    });

    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk.delta);
      if (chunk.done) break;
    }

    expect(chunks.join(" ")).toContain("hello");
  });

  it("handles empty message list", async () => {
    const stream = provider.streamChat({
      model: {
        tier: "high",
        provider: "openai",
        baseUrl: "https://api.example.com",
        apiKeyRef: "key",
        modelId: "gpt"
      },
      messages: []
    });

    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk.delta);
      if (chunk.done) break;
    }

    expect(chunks.join("")).toBe("");
  });
});
