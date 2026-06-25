import { Suspense } from "react";

import { RecommendationPreferenceSync } from "@/components/RecommendationPreferenceSync";
import { RecommendationsList } from "@/components/RecommendationsList";

export const dynamic = "force-dynamic";

type ExplorePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = await searchParams;
  return (
    <>
      <Suspense fallback={null}>
        <RecommendationPreferenceSync />
      </Suspense>
      <RecommendationsList searchParams={params} />
    </>
  );
}
