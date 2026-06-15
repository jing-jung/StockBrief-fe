"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { addServerWatchlistItem, deleteServerWatchlistItem } from "@/lib/api";
import { readAuthSession, subscribeAuthSession } from "@/lib/cognito-auth";
import {
  getServerWatchlistSnapshot,
  readServerWatchlistSnapshot,
  refreshServerWatchlistSnapshot,
  rollbackServerWatchlist,
  saveServerWatchlistBackup,
  subscribeServerWatchlistSnapshot,
} from "@/lib/server-watchlist-store";
import {
  isTickerSaved,
  removeWatchlistItem,
  saveWatchlistItem,
  subscribeWatchlist,
} from "@/lib/watchlist-storage";
import type { ServerWatchlistResponse } from "@/types/api";
import type { WatchlistInput } from "@/types/watchlist";

export function WatchlistToggle({
  item,
  variant = "default",
}: {
  item: WatchlistInput;
  variant?: "default" | "compact";
}) {
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const serverSnapshot = useSyncExternalStore(
    subscribeServerWatchlistSnapshot,
    () => readServerWatchlistSnapshot(accessToken),
    () => null,
  );
  const serverSaved =
    serverSnapshot?.items.some((serverItem) => serverItem.ticker === item.ticker) ?? false;
  const currentSaved = accessToken ? serverSaved : saved;

  useEffect(() => {
    const sync = () => {
      if (!readAuthSession()) {
        setSaved(isTickerSaved(item.ticker));
      }
      setReady(true);
    };

    sync();
    return subscribeWatchlist(sync);
  }, [item.ticker]);

  useEffect(() => {
    const sync = () => setAccessToken(readAuthSession()?.accessToken ?? null);
    sync();
    return subscribeAuthSession(sync);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const token = accessToken;
    let cancelled = false;
    async function loadServerState() {
      setReady(false);
      try {
        await getServerWatchlistSnapshot(token);
      } catch {
        // Keep the previous snapshot if refresh fails; the button remains usable for retry.
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void loadServerState();
    return () => {
      cancelled = true;
    };
  }, [accessToken, item.ticker]);

  async function toggle() {
    if (accessToken) {
      saveServerWatchlistBackup(accessToken);
      setReady(false);

      try {
        if (currentSaved) {
          await deleteServerWatchlistItem(accessToken, item.ticker);
        } else {
          await addServerWatchlistItem(accessToken, item);
        }
        await refreshServerWatchlistSnapshot(accessToken);
      } catch (error) {
        rollbackServerWatchlist(accessToken);
        console.error("서버 관심종목 상태 갱신에 실패했습니다.", error);
      } finally {
        setReady(true);
      }
      return;
    }

    if (currentSaved) {
      removeWatchlistItem(item.ticker);
      return;
    }

    saveWatchlistItem(item);
  }

  const label = currentSaved ? "관심종목 해제" : "관심종목 저장";
  const baseClass =
    "inline-flex items-center justify-center rounded-md border text-sm font-semibold transition focus:outline-none focus:shadow-focus disabled:cursor-not-allowed disabled:opacity-60";
  const sizeClass = variant === "compact" ? "px-3 py-1.5" : "px-4 py-2";
  const toneClass = currentSaved
    ? "border-accent bg-accent text-white hover:bg-ink"
    : "border-line bg-white text-ink hover:border-accent hover:text-accent";

  return (
    <button
      type="button"
      aria-pressed={currentSaved}
      disabled={!ready}
      onClick={() => void toggle()}
      className={`${baseClass} ${sizeClass} ${toneClass}`}
    >
      {ready ? label : "상태 확인"}
    </button>
  );
}
