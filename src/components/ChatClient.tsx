"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ChatExplanationPanel } from "@/components/ChatExplanationPanel";
import { takeChatResumeSession } from "@/lib/chat-resume";

const DEFAULT_TICKER = "005930";

export function ChatClient() {
  const searchParams = useSearchParams();
  const initialTicker = normalizeTicker(searchParams.get("ticker") ?? DEFAULT_TICKER);
  const [initialSessionId, setInitialSessionId] = useState<string | null>(null);
  const [tickerInput, setTickerInput] = useState(initialTicker || DEFAULT_TICKER);
  const normalizedTicker = normalizeTicker(tickerInput);
  const canAsk = normalizedTicker.length === 6;
  const sessionId = normalizedTicker === initialTicker ? initialSessionId : null;

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setInitialSessionId(takeChatResumeSession(initialTicker));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialTicker]);

  return (
    <section className="py-6">
      <label className="block max-w-sm">
        <span className="text-xs font-medium text-muted">종목 코드</span>
        <input
          value={tickerInput}
          onChange={(event) => setTickerInput(event.target.value)}
          inputMode="numeric"
          maxLength={6}
          className="mt-1 w-full rounded-md border border-line bg-field px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:bg-white focus:shadow-focus"
        />
      </label>
      {canAsk ? (
        <ChatExplanationPanel
          key={`${normalizedTicker}:${sessionId ?? ""}`}
          ticker={normalizedTicker}
          initialSessionId={sessionId}
        />
      ) : (
        <div className="mt-6 border-y border-line py-6 text-sm text-muted">
          6자리 종목 코드를 입력하면 설명 패널이 열립니다.
        </div>
      )}
    </section>
  );
}

function normalizeTicker(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}
