import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { OnboardingKeys } from "@repo/types";
import { useExpertModeOnboardingHighlight } from "./useExpertModeOnboardingHighlight";

const { spotlightMock } = vi.hoisted(() => ({ spotlightMock: vi.fn() }));

vi.mock("@/hooks/useOnboardingSpotlight", () => ({
  useOnboardingSpotlight: spotlightMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  spotlightMock.mockReturnValue({ isPending: true });
});

describe("useExpertModeOnboardingHighlight", () => {
  it("spotlights the expert-mode checkbox under its own key", () => {
    renderHook(() => useExpertModeOnboardingHighlight(true, true));
    expect(spotlightMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: OnboardingKeys.EMISSION_CAPTURE_EXPERT_MODE,
        targetId: "emission-capture-expert-mode",
        isApplicable: true,
      })
    );
  });

  it("is not applicable where expert mode is not offered", () => {
    // Not applicable rather than blocked once the data is in: the per-line
    // hints queue behind this one, and a screen without the checkbox must
    // release them, not stall.
    renderHook(() => useExpertModeOnboardingHighlight(false, true));
    expect(spotlightMock).toHaveBeenCalledWith(
      expect.objectContaining({ isApplicable: false, isBlocked: false })
    );
  });

  it("holds its ruling while the category data is still loading", () => {
    // Before the data loads expert mode reads as unavailable only because
    // there is nothing to look at. Ruling then would release the queue for
    // good, and the data arriving would open two popovers at once.
    renderHook(() => useExpertModeOnboardingHighlight(false, false));
    expect(spotlightMock).toHaveBeenCalledWith(
      expect.objectContaining({ isBlocked: true })
    );
  });
});
