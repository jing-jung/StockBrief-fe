import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getUserPreferences } from "@/lib/api";
import { readApiAuthToken } from "@/lib/cognito-auth";

import { RecommendationPreferenceSync } from "./RecommendationPreferenceSync";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  getUserPreferences: vi.fn(),
}));

vi.mock("@/lib/cognito-auth", () => ({
  readApiAuthToken: vi.fn(),
}));

const mockedUsePathname = vi.mocked(usePathname);
const mockedUseRouter = vi.mocked(useRouter);
const mockedUseSearchParams = vi.mocked(useSearchParams);
const mockedGetUserPreferences = vi.mocked(getUserPreferences);
const mockedReadApiAuthToken = vi.mocked(readApiAuthToken);

const replace = vi.fn();

describe("RecommendationPreferenceSync", () => {
  beforeEach(() => {
    replace.mockReset();
    mockedUsePathname.mockReturnValue("/recommendations");
    mockedUseRouter.mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
    mockedUseSearchParams.mockReturnValue(readonlySearchParams({ market: "KOSPI" }));
    mockedReadApiAuthToken.mockReturnValue("id-token");
    mockedGetUserPreferences.mockResolvedValue({ preferences: { risk_profile: "aggressive" } });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("applies the saved risk profile when the URL has no explicit risk_profile", async () => {
    render(<RecommendationPreferenceSync />);

    await waitFor(() => {
      expect(mockedGetUserPreferences).toHaveBeenCalledWith("id-token");
      expect(replace).toHaveBeenCalledWith("/recommendations?market=KOSPI&risk_profile=aggressive", {
        scroll: false,
      });
    });
  });

  it("keeps an explicit URL risk_profile ahead of saved preferences", () => {
    mockedUseSearchParams.mockReturnValue(readonlySearchParams({ risk_profile: "conservative" }));

    render(<RecommendationPreferenceSync />);

    expect(mockedGetUserPreferences).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("skips preference lookup when the user is unauthenticated", () => {
    mockedReadApiAuthToken.mockReturnValue(null);

    render(<RecommendationPreferenceSync />);

    expect(mockedGetUserPreferences).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("leaves the URL unchanged for the balanced default profile", async () => {
    mockedGetUserPreferences.mockResolvedValue({ preferences: { risk_profile: "balanced" } });

    render(<RecommendationPreferenceSync />);

    await waitFor(() => {
      expect(mockedGetUserPreferences).toHaveBeenCalledWith("id-token");
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it("ignores invalid saved risk profile values", async () => {
    mockedGetUserPreferences.mockResolvedValue({ preferences: { risk_profile: "growth" } });

    render(<RecommendationPreferenceSync />);

    await waitFor(() => {
      expect(mockedGetUserPreferences).toHaveBeenCalledWith("id-token");
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not interrupt the recommendation page when preference loading fails", async () => {
    mockedGetUserPreferences.mockRejectedValue(new Error("preferences unavailable"));

    render(<RecommendationPreferenceSync />);

    await waitFor(() => {
      expect(mockedGetUserPreferences).toHaveBeenCalledWith("id-token");
    });
    expect(replace).not.toHaveBeenCalled();
  });
});

function readonlySearchParams(init?: Record<string, string>) {
  return new URLSearchParams(init) as unknown as ReturnType<typeof useSearchParams>;
}
