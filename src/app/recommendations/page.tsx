import { Suspense } from "react";

import { cookies } from "next/headers";

import { MissingCookiePreferenceSync } from "@/components/MissingCookiePreferenceSync";
import { RecommendationsList } from "@/components/RecommendationsList";

export const dynamic = "force-dynamic";

type RecommendationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RecommendationsPage({ searchParams }: RecommendationsPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const hasCookie = cookieStore.has("stockbrief_risk_profile");

  return (
    <>
      <Suspense fallback={null}>
        <MissingCookiePreferenceSync hasCookie={hasCookie} />
      </Suspense>
      <RecommendationsList searchParams={params} />
    </>
  );
}
