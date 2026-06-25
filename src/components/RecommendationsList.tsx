import { cookies } from "next/headers";
import { CandidateTable } from "@/components/CandidateTable";
import { ErrorState } from "@/components/ErrorState";
import { getRecommendationCandidates } from "@/lib/api";
import { riskProfileQueryValue } from "@/lib/risk-profile";

type RecommendationsListProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export async function RecommendationsList({ searchParams }: RecommendationsListProps) {
  let rawProfile = searchParams.risk_profile;
  if (!rawProfile) {
    const cookieStore = await cookies();
    rawProfile = cookieStore.get("stockbrief_risk_profile")?.value;
  }
  const riskProfile = riskProfileQueryValue(rawProfile);
  let candidates: Awaited<ReturnType<typeof getRecommendationCandidates>>;

  try {
    candidates = await getRecommendationCandidates({
      riskProfile,
      market:
        searchParams.market === "KOSPI" || searchParams.market === "KOSDAQ"
          ? searchParams.market
          : undefined,
      sector: typeof searchParams.sector === "string" ? searchParams.sector : undefined,
      limit: 20,
    });
  } catch {
    return (
      <div className="mx-auto max-w-7xl px-5 py-8">
        <ErrorState href="/" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <section className="mb-6 flex flex-col gap-3 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-accent">오늘의 추천 후보</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">추천 후보 리스트</h1>
          <p className="mt-2 text-sm text-muted">
            공개 데이터 기준으로 추천 이유, 근거, 리스크, 누락 데이터를 함께 확인합니다.
          </p>
        </div>
        <div className="text-sm text-muted">
          성향: {candidates.risk_profile} · 후보 {candidates.count}개
        </div>
      </section>
      <CandidateTable items={candidates.items} />
    </div>
  );
}
