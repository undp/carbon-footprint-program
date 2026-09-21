import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { OnboardingKeys } from "@repo/types";
import { useLineExtraInfoOnboardingHighlight } from "./useLineExtraInfoOnboardingHighlight";

const { spotlightMock } = vi.hoisted(() => ({ spotlightMock: vi.fn() }));

vi.mock("@/hooks/useOnboardingSpotlight", () => ({
  useOnboardingSpotlight: spotlightMock,
}));

const lastCall = () =>
  spotlightMock.mock.calls[0][0] as { isBlocked: boolean; key: string };

beforeEach(() => {
  vi.clearAllMocks();
  spotlightMock.mockReturnValue({ isPending: true });
});

describe("useLineExtraInfoOnboardingHighlight", () => {
  it("spotlights the extra-info button under its own key", () => {
    renderHook(() => useLineExtraInfoOnboardingHighlight(true, false));
    expect(spotlightMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: OnboardingKeys.EMISSION_CAPTURE_LINE_EXTRA_INFO,
        targetId: "emission-capture-line-extra-info",
        isBlocked: false,
      })
    );
  });

  it("holds until there is a line to act on", () => {
    renderHook(() => useLineExtraInfoOnboardingHighlight(false, false));
    expect(lastCall().isBlocked).toBe(true);
  });

  it("holds behind the attachments hint so the two do not stack", () => {
    renderHook(() => useLineExtraInfoOnboardingHighlight(true, true));
    expect(lastCall().isBlocked).toBe(true);
  });
});
