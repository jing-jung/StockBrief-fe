"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getUserPreferences } from "@/lib/api";
import { readApiAuthToken } from "@/lib/cognito-auth";
import { readRiskProfile } from "@/lib/risk-profile";

export function RecommendationPreferenceSync() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.has("risk_profile")) {
      return;
    }

    const accessToken = readApiAuthToken();
    if (!accessToken) {
      return;
    }
    const preferenceAccessToken = accessToken;

    let cancelled = false;
    async function applySavedRiskProfile() {
      try {
        const response = await getUserPreferences(preferenceAccessToken);
        if (cancelled) return;

        const riskProfile = readRiskProfile(response.preferences.risk_profile);
        if (!riskProfile || riskProfile === "balanced") {
          return;
        }

        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("risk_profile", riskProfile);
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
      } catch {
        return;
      }
    }

    void applySavedRiskProfile();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, searchParams]);

  return null;
}
