import type { RiskProfile } from "@/types/api";

const COOKIE_NAME = "stockbrief_risk_profile";

export function setRiskProfileCookie(profile: RiskProfile): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  const secureFlag = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${COOKIE_NAME}=${profile}; path=/; max-age=${maxAge}; samesite=lax${secureFlag}`;
}

export function clearRiskProfileCookie(): void {
  if (typeof document === "undefined") return;
  const secureFlag = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}`;
}
