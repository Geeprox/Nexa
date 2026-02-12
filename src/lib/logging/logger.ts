export type LogLevel = "info" | "warn" | "error";

function toMessage(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function emit(level: LogLevel, scope: string, message: string, extra?: unknown) {
  const prefix = `[Nexa][${scope}] ${message}`;
  if (level === "error") {
    console.error(prefix, extra ?? "");
    return;
  }
  if (level === "warn") {
    console.warn(prefix, extra ?? "");
    return;
  }
  console.info(prefix, extra ?? "");
}

export function logInfo(scope: string, message: string, extra?: unknown) {
  emit("info", scope, message, extra);
}

export function logWarn(scope: string, message: string, extra?: unknown) {
  emit("warn", scope, message, extra);
}

export function logError(scope: string, error: unknown, extra?: unknown) {
  emit("error", scope, toMessage(error), extra);
}
