import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSearchParams } from "next/navigation";

import { ChatExplanationPanel } from "@/components/ChatExplanationPanel";
import { storeChatResumeSession } from "@/lib/chat-resume";

import { ChatClient } from "./ChatClient";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

vi.mock("@/components/ChatExplanationPanel", () => ({
  ChatExplanationPanel: vi.fn(({ ticker, initialSessionId }) => (
    <div data-testid="chat-panel">
      {ticker}:{initialSessionId ?? "new-session"}
    </div>
  )),
}));

const mockedUseSearchParams = vi.mocked(useSearchParams);
const mockedChatExplanationPanel = vi.mocked(ChatExplanationPanel);

describe("ChatClient", () => {
  beforeEach(() => {
    mockedUseSearchParams.mockReturnValue(readonlySearchParams());
  });

  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("opens a default chat panel when query params are absent", () => {
    render(<ChatClient />);

    expect(screen.getByTestId("chat-panel").textContent).toBe("005930:new-session");
    expect(mockedChatExplanationPanel).toHaveBeenLastCalledWith(
      { ticker: "005930", initialSessionId: null },
      undefined,
    );
  });

  it("passes a stored resume session into the chat panel without a session_id query param", async () => {
    storeChatResumeSession({ ticker: "005380", sessionId: "chat-session-existing" });
    mockedUseSearchParams.mockReturnValue(
      readonlySearchParams({
        ticker: "005380",
      }),
    );

    render(<ChatClient />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-panel").textContent).toBe("005380:chat-session-existing");
      expect(mockedChatExplanationPanel).toHaveBeenLastCalledWith(
        { ticker: "005380", initialSessionId: "chat-session-existing" },
        undefined,
      );
    });
  });

  it("drops the initial session when the user changes the ticker", async () => {
    storeChatResumeSession({ ticker: "005930", sessionId: "chat-session-existing" });
    mockedUseSearchParams.mockReturnValue(
      readonlySearchParams({
        ticker: "005930",
      }),
    );

    render(<ChatClient />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-panel").textContent).toBe("005930:chat-session-existing");
    });

    fireEvent.change(screen.getByLabelText("종목 코드"), {
      target: { value: "005380" },
    });

    expect(screen.getByTestId("chat-panel").textContent).toBe("005380:new-session");
    expect(mockedChatExplanationPanel).toHaveBeenLastCalledWith(
      { ticker: "005380", initialSessionId: null },
      undefined,
    );
  });

  it("ignores a direct session_id query param", () => {
    mockedUseSearchParams.mockReturnValue(
      readonlySearchParams({
        ticker: "005380",
        session_id: "chat-session-existing",
      }),
    );

    render(<ChatClient />);

    expect(screen.getByTestId("chat-panel").textContent).toBe("005380:new-session");
    expect(mockedChatExplanationPanel).toHaveBeenLastCalledWith(
      { ticker: "005380", initialSessionId: null },
      undefined,
    );
  });
});

function readonlySearchParams(init?: Record<string, string>) {
  return new URLSearchParams(init) as unknown as ReturnType<typeof useSearchParams>;
}
