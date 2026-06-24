const CHAT_RESUME_SESSION_KEY = "stockbrief_chat_resume_session_v1";

interface StoredChatResumeSession {
  ticker: string;
  session_id: string;
}

interface ChatResumeInput {
  ticker: string;
  sessionId: string;
}

export function storeChatResumeSession({ ticker, sessionId }: ChatResumeInput): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      CHAT_RESUME_SESSION_KEY,
      JSON.stringify({
        ticker,
        session_id: sessionId,
      }),
    );
  } catch {
    return;
  }
}

export function takeChatResumeSession(ticker: string): string | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(CHAT_RESUME_SESSION_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    window.sessionStorage.removeItem(CHAT_RESUME_SESSION_KEY);
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredChatResumeSession>;
    if (parsed.ticker === ticker && typeof parsed.session_id === "string" && parsed.session_id.trim()) {
      return parsed.session_id;
    }
  } catch {
    return null;
  }
  return null;
}
