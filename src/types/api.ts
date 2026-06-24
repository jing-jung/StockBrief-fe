export type EvidenceLevel = "strong" | "medium" | "weak";
export type RiskProfile = "conservative" | "balanced" | "aggressive";

export interface ScoreComponent {
  name: string;
  weight: number;
  raw_score: number | null;
  weighted_score: number;
  reason: string;
  input_refs: string[];
  evidence_ids: string[];
}

export interface RecommendationReason {
  reason_id: string;
  component: string;
  summary: string;
  evidence_ids: string[];
  source_document_ids: string[];
}

export interface RecommendationCandidate {
  ticker: string;
  name: string;
  market: string;
  sector: string | null;
  recommendation_score: number;
  score_components: ScoreComponent[];
  recommendation_reasons: RecommendationReason[];
  risk_tags: string[];
  evidence_level: EvidenceLevel;
  evidence_count: number;
  missing_data: unknown[];
  data_freshness: Record<string, unknown>;
  disclaimer: string;
}

export interface RecommendationCandidateList {
  items: RecommendationCandidate[];
  count: number;
  risk_profile: RiskProfile;
  disclaimer: string;
}

export interface StockSearchItem {
  ticker: string;
  name: string;
  market: string;
  sector: string | null;
  industry: string | null;
}

export interface StockSearchResponse {
  query: string;
  count: number;
  items: StockSearchItem[];
}

export interface CompanyIdentifier {
  provider: string;
  identifier_type: string;
  identifier_value: string;
  is_primary: boolean;
}

export interface StockDetail {
  ticker: string;
  name: string;
  name_en: string | null;
  market: string;
  sector: string | null;
  industry: string | null;
  listing_date: string | null;
  is_active: boolean;
  identifiers: CompanyIdentifier[];
}

export interface StockEvidenceItem {
  id: string;
  type: "news" | "disclosure" | "financial" | "price";
  title: string;
  summary: string;
  source_name: string;
  source_url: string | null;
  source_identifier: string | null;
  published_at: string | null;
  as_of_date: string | null;
  data_status: "available" | "fallback" | "missing";
}

export interface StockEvidenceResponse {
  ticker: string;
  evidence: StockEvidenceItem[];
  message: string | null;
}

export interface ChatRequest {
  session_id?: string;
  ticker: string;
  message: string;
  title?: string;
}

export interface ChatCitation {
  evidence_id: string;
  type: "news" | "disclosure" | "financial" | "price";
  title: string;
  source_name: string;
  source_url: string | null;
  as_of_date: string | null;
}

export interface ChatResponse {
  session_id: string | null;
  message_id: string | null;
  answer: string;
  citations: ChatCitation[];
  policy_status: "allowed" | "redirected" | "blocked";
  disclaimer: string;
  used_evidence_ids: string[];
}

export interface MeResponse {
  id: string;
  cognito_sub: string;
  email: string | null;
  email_verified: boolean;
  nickname: string | null;
}

export interface UserPreferencesResponse {
  preferences: Record<string, unknown>;
}

export interface ServerWatchlistItem {
  ticker: string;
  name: string;
  market: string;
  sector: string | null;
  memo: string | null;
  saved_at: string;
}

export interface ServerWatchlistResponse {
  items: ServerWatchlistItem[];
  count: number;
}

export interface ServerWatchlistImportResponse {
  imported_count: number;
  skipped_existing_count: number;
  items: ServerWatchlistItem[];
}

export interface UserChatSession {
  session_id: string;
  ticker: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserChatSessionListResponse {
  items: UserChatSession[];
  count: number;
}

export interface UserChatMessage {
  message_id: string;
  role: string;
  content: string;
  ticker: string | null;
  citations: Record<string, unknown>[];
  safety_flags: Record<string, unknown>[];
  created_at: string;
}

export interface UserChatSessionDetailResponse {
  session: UserChatSession;
  messages: UserChatMessage[];
}
