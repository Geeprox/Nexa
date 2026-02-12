import { logError, logInfo } from "@/lib/logging/logger";
import { pickRandomMockReply } from "@/lib/mock/chatResponses";

export interface MockProviderRequest {
  conversationId: string;
  prompt: string;
  previousReplies?: string[];
  providerUrl: string;
  apiKey: string;
}

export interface MockProviderChunk {
  completionId: string;
  delta: string;
  done: boolean;
  model: string;
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Request aborted", "AbortError"));
      return;
    }

    let handleAbort: (() => void) | null = null;
    const timeoutId = window.setTimeout(() => {
      if (signal && handleAbort) {
        signal.removeEventListener("abort", handleAbort);
      }
      resolve();
    }, ms);
    if (!signal) {
      return;
    }

    handleAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Request aborted", "AbortError"));
    };
    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

function chunkMessage(content: string) {
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < content.length) {
    const size = 14 + Math.floor(Math.random() * 14);
    const nextCursor = Math.min(content.length, cursor + size);
    chunks.push(content.slice(cursor, nextCursor));
    cursor = nextCursor;
  }
  return chunks;
}

function redactKey(apiKey: string) {
  if (!apiKey) {
    return "(empty)";
  }
  if (apiKey.length <= 8) {
    return "***";
  }
  return `${apiKey.slice(0, 4)}***${apiKey.slice(-2)}`;
}

export async function* streamMockProviderResponse(
  request: MockProviderRequest,
  options?: { signal?: AbortSignal }
): AsyncGenerator<MockProviderChunk, string, void> {
  const completionId = `mockcmpl-${crypto.randomUUID().slice(0, 10)}`;
  const model = "mock-gpt-4.1";
  const fullReply = pickRandomMockReply(request.prompt, request.previousReplies ?? []);

  logInfo("mockProvider", "Dispatching mock completion request.", {
    conversationId: request.conversationId,
    providerUrl: request.providerUrl,
    apiKey: redactKey(request.apiKey),
    model
  });

  const chunks = chunkMessage(fullReply);
  let streamedContent = "";

  for (const chunk of chunks) {
    try {
      await wait(24 + Math.floor(Math.random() * 36), options?.signal);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        logError("mockProvider", error, {
          message: "Mock completion stream interrupted."
        });
      }
      throw error;
    }

    streamedContent += chunk;
    yield {
      completionId,
      delta: chunk,
      done: false,
      model
    };
  }

  yield {
    completionId,
    delta: "",
    done: true,
    model
  };
  return streamedContent;
}
