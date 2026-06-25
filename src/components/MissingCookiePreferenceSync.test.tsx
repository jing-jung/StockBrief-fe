import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getUserPreferences } from "@/lib/api";
import { readApiAuthToken } from "@/lib/cognito-auth";
import { setRiskProfileCookie } from "@/lib/preference-cookie";
import { MissingCookiePreferenceSync } from "./MissingCookiePreferenceSync";

const mockReplace = vi.fn();
const mockRefresh = vi.fn();
const mockHas = vi.fn();
const mockSet = vi.fn();
const mockToString = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/recommendations",
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
  useSearchParams: () => ({
    has: mockHas,
    get: vi.fn(),
    entries: () => [],
    forEach: vi.fn(),
    keys: () => [],
    values: () => [],
    toString: mockToString,
  }),
}));

vi.mock("@/lib/api", () => ({
  getUserPreferences: vi.fn(),
}));

vi.mock("@/lib/cognito-auth", () => ({
  readApiAuthToken: vi.fn(),
}));

vi.mock("@/lib/preference-cookie", () => ({
  setRiskProfileCookie: vi.fn(),
}));

const mockedReadApiAuthToken = vi.mocked(readApiAuthToken);
const mockedGetUserPreferences = vi.mocked(getUserPreferences);
const mockedSetRiskProfileCookie = vi.mocked(setRiskProfileCookie);

describe("MissingCookiePreferenceSync", () => {
  beforeEach(() => {
    mockHas.mockReturnValue(false);
    mockToString.mockReturnValue("");
    mockedReadApiAuthToken.mockReturnValue("test-token");
    mockedGetUserPreferences.mockResolvedValue({
      preferences: { risk_profile: "aggressive" },
    } as any);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("does nothing if hasCookie is true", () => {
    render(<MissingCookiePreferenceSync hasCookie={true} />);
    expect(mockedReadApiAuthToken).not.toHaveBeenCalled();
  });

  it("fetches preference and sets cookie if hasCookie is false and user is logged in", async () => {
    render(<MissingCookiePreferenceSync hasCookie={false} />);
    
    await waitFor(() => {
      expect(mockedGetUserPreferences).toHaveBeenCalledWith("test-token");
    });
    
    expect(mockedSetRiskProfileCookie).toHaveBeenCalledWith("aggressive");
    expect(mockReplace).toHaveBeenCalledWith("/recommendations?risk_profile=aggressive", { scroll: false });
  });

  it("calls refresh if preference is balanced", async () => {
    mockedGetUserPreferences.mockResolvedValue({
      preferences: { risk_profile: "balanced" },
    } as any);
    render(<MissingCookiePreferenceSync hasCookie={false} />);
    
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
    
    expect(mockedSetRiskProfileCookie).toHaveBeenCalledWith("balanced");
  });
});
