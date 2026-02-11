import type { ChatMessage, ChatStreamChunk, LlmProvider, ModelProfile } from "./types";

export class OpenAIProvider implements LlmProvider {
  async *streamChat(input: {
    model: ModelProfile;
    messages: ChatMessage[];
  }): AsyncIterable<ChatStreamChunk> {
    const { messages } = input;
    yield {
      id: "stub",
      delta: messages.at(-1)?.content ?? "",
      done: true
    };
  }
}
