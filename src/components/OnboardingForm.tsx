"use client";

import { useEffect, useState } from "react";

import { riskProfileLabel } from "@/lib/format";

const storageKey = "stockbrief:preferences";
const onboardingKey = "stockbrief:onboarding_completed";

interface Preferences {
  riskProfile: "conservative" | "balanced" | "aggressive";
  markets: string[];
}

const defaultPreferences: Preferences = {
  riskProfile: "balanced",
  markets: ["KOSPI", "KOSDAQ"],
};

const riskProfiles = ["conservative", "balanced", "aggressive"] as const;

export function OnboardingForm() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      queueMicrotask(() => setPreferences(parsePreferences(raw)));
    }
  }, []);

  function toggleMarket(market: string) {
    setPreferences((current) => ({
      ...current,
      markets: current.markets.includes(market)
        ? current.markets.filter((item) => item !== market)
        : [...current.markets, market],
    }));
  }

  function save() {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
    window.localStorage.setItem(onboardingKey, "true");
    setSaved(true);
  }

  return (
    <div className="space-y-8">
      <section className="border-y border-line bg-white py-6">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-xl font-semibold text-ink">선호 설정</h2>
          <p className="mt-2 text-sm text-muted">관심 시장과 리스크 성향을 브라우저에 저장합니다.</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-3xl gap-8 px-5">
        <fieldset className="space-y-3">
          <legend className="font-semibold text-ink">리스크 성향</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {riskProfiles.map((profile) => (
              <button
                key={profile}
                type="button"
                onClick={() => setPreferences((current) => ({ ...current, riskProfile: profile }))}
                className={`rounded-md border px-4 py-3 text-left text-sm transition focus:outline-none focus:shadow-focus ${
                  preferences.riskProfile === profile
                    ? "border-accent bg-[#e7f4f1] text-ink"
                    : "border-line bg-white text-muted hover:text-ink"
                }`}
              >
                {riskProfileLabel(profile)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-semibold text-ink">관심 시장</legend>
          <div className="flex flex-wrap gap-2">
            {["KOSPI", "KOSDAQ"].map((market) => (
              <label key={market} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={preferences.markets.includes(market)}
                  onChange={() => toggleMarket(market)}
                  className="h-4 w-4 accent-accent"
                />
                {market}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={save}
          className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent focus:outline-none focus:shadow-focus"
        >
          저장
        </button>
        {saved ? <p className="text-sm text-accent">설정이 저장됐습니다.</p> : null}
      </div>
    </div>
  );
}

function parsePreferences(raw: string): Preferences {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isPreferences(parsed) ? parsed : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

function isPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<Preferences>;
  const validRiskProfile =
    candidate.riskProfile === "conservative" ||
    candidate.riskProfile === "balanced" ||
    candidate.riskProfile === "aggressive";
  const validMarkets =
    Array.isArray(candidate.markets) &&
    candidate.markets.every((market) => market === "KOSPI" || market === "KOSDAQ");
  return validRiskProfile && validMarkets;
}
