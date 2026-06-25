import { afterEach, describe, expect, it, vi } from "vitest";

import { logClientError } from "./client-telemetry";

describe("client telemetry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs only safe error details from Error-like objects", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = Object.assign(new Error("request failed with bearer-token"), {
      name: "ApiError",
      status: 503,
      token: "secret-token",
      authorization: "Bearer id-token",
      email: "user@example.com",
    });

    logClientError("Auth callback flow failed.", error, { stage: "profile" });

    expect(consoleError).toHaveBeenCalledWith("Auth callback flow failed.", {
      stage: "profile",
      error: {
        name: "ApiError",
        status: 503,
      },
    });
    const serializedLogs = JSON.stringify(consoleError.mock.calls);
    expect(serializedLogs).not.toContain("bearer-token");
    expect(serializedLogs).not.toContain("secret-token");
    expect(serializedLogs).not.toContain("Bearer id-token");
    expect(serializedLogs).not.toContain("user@example.com");
  });

  it("keeps auth callback stage context while redacting non-Error details", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logClientError(
      "Auth callback flow failed.",
      {
        name: "AuthCallbackTokenMissingError",
        code: "auth-code",
        state: "auth-state",
        token: "id-token",
      },
      { stage: "token" },
    );

    expect(consoleError).toHaveBeenCalledWith("Auth callback flow failed.", {
      stage: "token",
      error: {
        name: "AuthCallbackTokenMissingError",
      },
    });
    const serializedLogs = JSON.stringify(consoleError.mock.calls);
    expect(serializedLogs).not.toContain("auth-code");
    expect(serializedLogs).not.toContain("auth-state");
    expect(serializedLogs).not.toContain("id-token");
  });
});
