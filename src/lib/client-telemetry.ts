export type ClientTelemetryStage = "callback" | "token" | "profile" | "watchlist_import";

export type ClientLogContext = {
  stage?: ClientTelemetryStage;
  ticker?: string;
  authenticated?: boolean;
  hasSession?: boolean;
  policy_status?: "allowed" | "redirected" | "blocked";
};

interface SafeErrorDetails {
  name: string;
  status?: number;
}

export function logClientError(
  message: string,
  error: unknown,
  context: ClientLogContext,
): void {
  console.error(message, {
    ...context,
    error: toSafeErrorDetails(error),
  });
}

function toSafeErrorDetails(error: unknown): SafeErrorDetails {
  if (error instanceof Error) {
    return withStatus(error.name || "Error", error);
  }
  if (isRecord(error)) {
    const name = typeof error.name === "string" ? error.name : "UnknownError";
    return withStatus(name, error);
  }
  return { name: "UnknownError" };
}

function withStatus(name: string, source: object): SafeErrorDetails {
  const status = (source as { status?: unknown }).status;
  return typeof status === "number" ? { name, status } : { name };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
