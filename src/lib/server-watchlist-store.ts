"use client";

import { getServerWatchlist, importServerWatchlist } from "@/lib/api";
import { readWatchlist } from "@/lib/watchlist-storage";
import type { MeResponse, ServerWatchlistItem, ServerWatchlistResponse } from "@/types/api";
import type { WatchlistInput } from "@/types/watchlist";

let cachedToken: string | null = null;
let cachedResponse: ServerWatchlistResponse | null = null;
let pendingToken: string | null = null;
let pendingRequest: Promise<ServerWatchlistResponse> | null = null;
const previousState: Record<string, ServerWatchlistItem[] | null> = {};

const listeners = new Set<() => void>();

export const WATCHLIST_SYNC_STATE_KEY = "stockbrief_watchlist_v1_sync_state";

export interface WatchlistSyncResult {
  importedCount: number;
  skippedExistingCount: number;
  items: ServerWatchlistItem[];
}

interface SyncState {
  [cognitoSub: string]: {
    syncedAt: string;
  };
}

export function readServerWatchlistSnapshot(
  accessToken: string | null,
): ServerWatchlistResponse | null {
  if (!accessToken || cachedToken !== accessToken) {
    return null;
  }
  return cachedResponse;
}

export function getServerWatchlistSnapshot(
  accessToken: string,
): Promise<ServerWatchlistResponse> {
  if (cachedToken === accessToken && cachedResponse) {
    return Promise.resolve(cachedResponse);
  }
  if (pendingToken === accessToken && pendingRequest) {
    return pendingRequest;
  }
  pendingToken = accessToken;
  pendingRequest = getServerWatchlist(accessToken)
    .then((response) => {
      setServerWatchlistSnapshot(accessToken, response);
      return response;
    })
    .finally(() => {
      pendingToken = null;
      pendingRequest = null;
    });
  return pendingRequest;
}

export function setServerWatchlistSnapshot(
  accessToken: string,
  response: ServerWatchlistResponse,
): void {
  cachedToken = accessToken;
  cachedResponse = response;
  emit();
}

export function updateServerWatchlistSnapshot(
  accessToken: string,
  update: (response: ServerWatchlistResponse) => ServerWatchlistResponse,
): void {
  if (cachedToken !== accessToken || !cachedResponse) {
    return;
  }
  setServerWatchlistSnapshot(accessToken, update(cachedResponse));
}

export function clearServerWatchlistSnapshot(): void {
  cachedToken = null;
  cachedResponse = null;
  pendingToken = null;
  pendingRequest = null;
  emit();
}

// 삭제 전 호출하여 상태 백업
export function saveServerWatchlistBackup(accessToken: string): void {
  if (cachedToken === accessToken && cachedResponse) {
    previousState[accessToken] = [...cachedResponse.items];
  } else {
    previousState[accessToken] = null;
  }
}

// 에러 발생 시 호출 (상태 롤백)
export function rollbackServerWatchlist(accessToken: string): void {
  const backupItems = previousState[accessToken];
  if (backupItems) {
    setServerWatchlistSnapshot(accessToken, { items: backupItems, count: backupItems.length });
  }
}

export async function refreshServerWatchlistSnapshot(
  accessToken: string,
): Promise<ServerWatchlistResponse> {
  if (pendingToken === accessToken && pendingRequest) {
    return pendingRequest;
  }
  pendingToken = accessToken;
  pendingRequest = getServerWatchlist(accessToken)
    .then((response) => {
      setServerWatchlistSnapshot(accessToken, response);
      return response;
    })
    .finally(() => {
      pendingToken = null;
      pendingRequest = null;
    });
  return pendingRequest;
}

export function isTickerInServerWatchlist(ticker: string): boolean {
  return cachedResponse?.items.some((item) => item.ticker === ticker) ?? false;
}

export async function importLocalWatchlistOnce(
  accessToken: string,
  me: MeResponse,
): Promise<WatchlistSyncResult> {
  const server = await getServerWatchlistSnapshot(accessToken);
  const serverTickers = new Set(server.items.map((item) => item.ticker));
  const localItems: WatchlistInput[] = readWatchlist()
    .filter((item) => !serverTickers.has(item.ticker))
    .map((item) => ({
      ticker: item.ticker,
      name: item.name,
      market: item.market,
      ...(item.sector ? { sector: item.sector } : {}),
      ...(item.memo ? { memo: item.memo } : {}),
    }));

  const imported =
    localItems.length > 0
      ? await importServerWatchlist(accessToken, localItems)
      : {
          imported_count: 0,
          skipped_existing_count: 0,
          items: server.items,
        };

  markSynced(me.cognito_sub);
  setServerWatchlistSnapshot(accessToken, {
    items: imported.items,
    count: imported.items.length,
  });
  return {
    importedCount: imported.imported_count,
    skippedExistingCount: imported.skipped_existing_count,
    items: imported.items,
  };
}

export function subscribeServerWatchlistSnapshot(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

function markSynced(cognitoSub: string): void {
  if (typeof window === "undefined") return;
  const state = readState();
  state[cognitoSub] = { syncedAt: new Date().toISOString() };
  window.localStorage.setItem(WATCHLIST_SYNC_STATE_KEY, JSON.stringify(state));
}

function readState(): SyncState {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(WATCHLIST_SYNC_STATE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as SyncState;
  } catch {
    return {};
  }
}
