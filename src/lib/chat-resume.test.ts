import { afterEach, describe, expect, it, vi } from "vitest";

import { storeChatResumeSession, takeChatResumeSession } from "./chat-resume";

describe("chat resume handoff", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("stores and consumes a matching session once", () => {
    storeChatResumeSession({ ticker: "005930", sessionId: "chat-session-1" });

    expect(takeChatResumeSession("005930")).toBe("chat-session-1");
    expect(takeChatResumeSession("005930")).toBeNull();
  });

  it("drops a stored session for a different ticker", () => {
    storeChatResumeSession({ ticker: "005930", sessionId: "chat-session-1" });

    expect(takeChatResumeSession("005380")).toBeNull();
    expect(takeChatResumeSession("005930")).toBeNull();
  });

  it("keeps navigation resilient when session storage write fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is blocked.", "SecurityError");
    });

    expect(() =>
      storeChatResumeSession({ ticker: "005930", sessionId: "chat-session-1" }),
    ).not.toThrow();
  });

  it("returns null when session storage read or cleanup fails", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => {
      throw new DOMException("Storage is blocked.", "SecurityError");
    });

    expect(takeChatResumeSession("005930")).toBeNull();

    storeChatResumeSession({ ticker: "005930", sessionId: "chat-session-1" });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementationOnce(() => {
      throw new DOMException("Storage cleanup is blocked.", "SecurityError");
    });

    expect(takeChatResumeSession("005930")).toBeNull();
  });
});
