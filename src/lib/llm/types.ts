export type ModelTier = "high" | "mid" | "low";

export interface ModelProfile {
  tier: ModelTier;
  provider: "openai" | "custom";
  baseUrl: string;
  apiKeyRef: string;
  modelId: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatStreamChunk {
  id: string;
  delta: string;
  done: boolean;
}

export interface LlmProvider {
  streamChat(input: {
    model: ModelProfile;
    messages: ChatMessage[];
  }): AsyncIterable<ChatStreamChunk>;
}
