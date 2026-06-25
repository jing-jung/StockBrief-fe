"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getUserPreferences } from "@/lib/api";
import { readApiAuthToken } from "@/lib/cognito-auth";
import { readRiskProfile } from "@/lib/risk-profile";
import { setRiskProfileCookie } from "@/lib/preference-cookie";

export function MissingCookiePreferenceSync({ hasCookie }: { hasCookie: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (hasCookie) return;
    if (searchParams.has("risk_profile")) return;

    const accessToken = readApiAuthToken();
    if (!accessToken) return;

    let cancelled = false;
    async function applySavedRiskProfile() {
      try {
        const response = await getUserPreferences(accessToken!);
        if (cancelled) return;

        const riskProfile = readRiskProfile(response.preferences.risk_profile);
        if (riskProfile) {
          setRiskProfileCookie(riskProfile);
          
          if (riskProfile !== "balanced") {
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.set("risk_profile", riskProfile);
            router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
          } else {
            router.refresh();
          }
        }
      } catch {
        return;
      }
    }

    void applySavedRiskProfile();
    return () => {
      cancelled = true;
    };
  }, [hasCookie, pathname, router, searchParams]);

  return null;
}
