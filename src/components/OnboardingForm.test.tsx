import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OnboardingForm } from "./OnboardingForm";

describe("OnboardingForm", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("shows risk profile choices with Korean labels while preserving stored values", () => {
    render(<OnboardingForm />);

    expect(screen.getByRole("button", { name: "안정형" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "균형형" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "적극형" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "conservative" })).toBeNull();
    expect(screen.queryByRole("button", { name: "balanced" })).toBeNull();
    expect(screen.queryByRole("button", { name: "aggressive" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "적극형" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(window.localStorage.getItem("stockbrief:onboarding_completed")).toBe("true");
    expect(JSON.parse(window.localStorage.getItem("stockbrief:preferences") ?? "{}")).toMatchObject({
      riskProfile: "aggressive",
    });
  });
});
