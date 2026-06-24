import type {
  ChatContractResponse,
  StockCandidateContractItem,
  StockCandidateContractResponse,
  StockDetailContractResponse,
  StockEvidenceContractResponse,
  StockSearchContractResponse,
} from "@/types/api-contract";
import type {
  ChatRequest,
  ChatResponse,
  MeResponse,
  RecommendationCandidate,
  RecommendationCandidateList,
  RiskProfile,
  ServerWatchlistImportResponse,
  ServerWatchlistResponse,
  StockDetail,
  StockEvidenceResponse,
  StockSearchResponse,
  UserChatSessionDetailResponse,
  UserChatSessionListResponse,
  UserPreferencesResponse,
} from "@/types/api";
import type { WatchlistInput } from "@/types/watchlist";

type EvidenceFilterType = "financial" | "news" | "disclosure" | "price";

const DEFAULT_API_BASE_URL = "http://localhost:8000/v1";
const DEFAULT_CHAT_SAFETY_DISCLAIMER =
  "공개 데이터 기반 설명이며 투자 조언이 아닙니다. 원문 확인이 필요합니다.";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(`API request failed: ${path}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function authorizedRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  return request<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });
}

export interface CandidateQuery {
  riskProfile?: RiskProfile;
  market?: "KOSPI" | "KOSDAQ";
  sector?: string;
  limit?: number;
}

export async function getRecommendationCandidates(
  query: CandidateQuery = {},
): Promise<RecommendationCandidateList> {
  const params = new URLSearchParams();
  if (query.riskProfile) params.set("risk_profile", query.riskProfile);
  if (query.market) params.set("market", query.market);
  if (query.sector) params.set("sector", query.sector);
  if (query.limit) params.set("limit", String(query.limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await request<StockCandidateContractResponse>(`/stocks/candidates${suffix}`);
  return {
    items: response.data.items.map(toRecommendationCandidate),
    count: response.data.pagination.total,
    risk_profile: query.riskProfile ?? "balanced",
    disclaimer: "공개 데이터 기반 검토 후보이며 최종 투자 판단은 사용자에게 있습니다.",
  };
}

export async function getRecommendationCandidate(
  ticker: string,
): Promise<RecommendationCandidate> {
  return request<RecommendationCandidate>(`/recommendations/candidates/${encodeURIComponent(ticker)}`);
}

export async function searchStocks(query = "", limit = 20): Promise<StockSearchResponse> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("limit", String(limit));
  const response = await request<StockSearchContractResponse>(`/stocks/search?${params.toString()}`);
  return {
    query,
    count: response.data.pagination.total,
    items: response.data.items.map((item) => ({
      ticker: item.ticker,
      name: item.name,
      market: item.market,
      sector: item.sector,
      industry: null,
    })),
  };
}

export async function getStock(ticker: string): Promise<StockDetail> {
  const response = await request<StockDetailContractResponse>(`/stocks/${encodeURIComponent(ticker)}`);
  return {
    ticker: response.data.stock.ticker,
    name: response.data.stock.name,
    name_en: null,
    market: response.data.stock.market,
    sector: response.data.stock.sector,
    industry: null,
    listing_date: null,
    is_active: true,
    identifiers: response.data.stock.corp_code
      ? [
          {
            provider: "OpenDART",
            identifier_type: "corp_code",
            identifier_value: response.data.stock.corp_code,
            is_primary: true,
          },
        ]
      : [],
  };
}

export async function getStockEvidence(
  ticker: string,
  type?: EvidenceFilterType,
): Promise<StockEvidenceResponse> {
  const params = new URLSearchParams();
  if (type) params.set("source_type", toContractEvidenceFilter(type));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await request<StockEvidenceContractResponse>(`/stocks/${encodeURIComponent(ticker)}/evidence${suffix}`);
  return {
    ticker: response.data.ticker,
    evidence: response.data.items.map((item) => ({
      id: item.id,
      type: fromContractSourceType(item.source_type),
      title: item.title,
      summary: item.snippet,
      source_name: item.source_name,
      source_url: item.url,
      source_identifier:
        typeof item.metadata.source_identifier === "string"
          ? item.metadata.source_identifier
          : null,
      published_at: item.published_at,
      as_of_date: typeof item.metadata.as_of_date === "string" ? item.metadata.as_of_date : null,
      data_status:
        item.metadata.data_status === "fallback" || item.metadata.data_status === "missing"
          ? item.metadata.data_status
          : "available",
    })),
    message: response.data.items.length === 0 ? "표시할 근거가 아직 없습니다." : null,
  };
}

export async function postChat(requestBody: ChatRequest): Promise<ChatResponse> {
  const response = await request<ChatContractResponse>("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  return toChatResponse(response);
}

export async function postAuthenticatedChat(
  accessToken: string,
  requestBody: ChatRequest,
): Promise<ChatResponse> {
  const response = await authorizedRequest<ChatContractResponse>("/chat", accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  return toChatResponse(response);
}

export async function getMe(accessToken: string): Promise<MeResponse> {
  return authorizedRequest<MeResponse>("/me", accessToken);
}

export async function patchMe(
  accessToken: string,
  body: { nickname?: string | null },
): Promise<MeResponse> {
  return authorizedRequest<MeResponse>("/me", accessToken, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function getUserPreferences(accessToken: string): Promise<UserPreferencesResponse> {
  return authorizedRequest<UserPreferencesResponse>("/me/preferences", accessToken);
}

export async function putUserPreferences(
  accessToken: string,
  preferences: Record<string, unknown>,
): Promise<UserPreferencesResponse> {
  return authorizedRequest<UserPreferencesResponse>("/me/preferences", accessToken, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ preferences }),
  });
}

export async function getServerWatchlist(accessToken: string): Promise<ServerWatchlistResponse> {
  return authorizedRequest<ServerWatchlistResponse>("/me/watchlist", accessToken);
}

export async function addServerWatchlistItem(
  accessToken: string,
  item: WatchlistInput,
): Promise<void> {
  await authorizedRequest("/me/watchlist", accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(item),
  });
}

export async function deleteServerWatchlistItem(
  accessToken: string,
  ticker: string,
): Promise<void> {
  await authorizedRequest(`/me/watchlist/${encodeURIComponent(ticker)}`, accessToken, {
    method: "DELETE",
  });
}

export async function patchServerWatchlistItem(
  accessToken: string,
  ticker: string,
  body: { memo?: string | null },
): Promise<void> {
  await authorizedRequest(`/me/watchlist/${encodeURIComponent(ticker)}`, accessToken, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function importServerWatchlist(
  accessToken: string,
  items: WatchlistInput[],
): Promise<ServerWatchlistImportResponse> {
  return authorizedRequest<ServerWatchlistImportResponse>("/me/watchlist/import", accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });
}

export async function getUserChatSessions(
  accessToken: string,
): Promise<UserChatSessionListResponse> {
  return authorizedRequest<UserChatSessionListResponse>("/me/chat-sessions", accessToken);
}

export async function getUserChatSessionDetail(
  accessToken: string,
  sessionId: string,
): Promise<UserChatSessionDetailResponse> {
  return authorizedRequest<UserChatSessionDetailResponse>(
    `/me/chat-sessions/${encodeURIComponent(sessionId)}`,
    accessToken,
  );
}

function toRecommendationCandidate(item: StockCandidateContractItem): RecommendationCandidate {
  const asOf = item.score.as_of;
  return {
    ticker: item.ticker,
    name: item.name,
    market: item.market,
    sector: item.sector,
    recommendation_score: item.score.total,
    score_components: [
      component("momentum_volatility", 10, item.score.breakdown.momentum),
      component("liquidity", 10, item.score.breakdown.liquidity),
      component("disclosure_event", 10, item.score.breakdown.disclosure),
      component("news_attention", 10, item.score.breakdown.news),
      component("financial_stability", 20, 0),
      component("profitability", 15, 0),
      component("growth", 15, 0),
      component("valuation", 10, 0),
    ],
    recommendation_reasons: [
      {
        reason_id: `contract-${item.ticker}-summary`,
        component: "news_attention",
        summary: "공개 데이터 기준 점수와 근거 요약이 확인됩니다.",
        evidence_ids: [],
        source_document_ids: [],
      },
    ],
    risk_tags: [],
    evidence_level:
      item.evidence_summary.news_count + item.evidence_summary.disclosure_count >= 2
        ? "medium"
        : "weak",
    evidence_count: item.evidence_summary.news_count + item.evidence_summary.disclosure_count,
    missing_data: [],
    data_freshness: {
      as_of: asOf,
      price_as_of: item.price?.trade_date ?? asOf,
      latest_evidence_at: item.evidence_summary.latest_at,
    },
    disclaimer: "공개 데이터 기반 검토 후보이며 최종 투자 판단은 사용자에게 있습니다.",
  };
}

function component(name: string, weight: number, weightedScore: number) {
  return {
    name,
    weight,
    raw_score: null,
    weighted_score: weightedScore,
    reason: "API 명세서 기반 mock 응답에서 계산된 점수 항목입니다.",
    input_refs: [],
    evidence_ids: [],
  };
}

function toContractEvidenceFilter(type: EvidenceFilterType) {
  if (type === "news") return "NEWS";
  if (type === "disclosure") return "DISCLOSURE";
  if (type === "financial" || type === "price") return "SCORE";
  return "CHUNK";
}

function fromContractSourceType(
  sourceType: "NEWS" | "DISCLOSURE" | "SCORE" | "CHUNK",
): "financial" | "news" | "disclosure" | "price" {
  if (sourceType === "NEWS") return "news";
  if (sourceType === "DISCLOSURE") return "disclosure";
  if (sourceType === "SCORE") return "financial";
  return "disclosure";
}

function toChatResponse(response: ChatContractResponse): ChatResponse {
  const safety = response.data.safety;
  const safetyDisclaimer = (safety?.disclaimer ?? "").trim();
  return {
    session_id: response.data.session_id,
    message_id: null,
    answer: response.data.answer,
    citations: response.data.citations.map((citation) => ({
      evidence_id: citation.id,
      type: fromContractSourceType(citation.source_type),
      title: citation.title,
      source_name: citation.source_type,
      source_url: citation.url,
      as_of_date: citation.published_at,
    })),
    policy_status: fromPolicyAction(safety?.policy_action),
    disclaimer: safetyDisclaimer || DEFAULT_CHAT_SAFETY_DISCLAIMER,
    used_evidence_ids: response.data.citations.map((citation) => citation.id),
  };
}

function fromPolicyAction(action?: "ALLOW" | "REDIRECT" | "BLOCK") {
  if (action === "ALLOW") return "allowed";
  if (action === "BLOCK") return "blocked";
  return "redirected";
}
