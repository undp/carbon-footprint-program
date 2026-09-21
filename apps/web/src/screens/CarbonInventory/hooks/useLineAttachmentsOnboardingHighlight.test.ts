import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { OnboardingKeys } from "@repo/types";
import { useLineAttachmentsOnboardingHighlight } from "./useLineAttachmentsOnboardingHighlight";

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

describe("useLineAttachmentsOnboardingHighlight", () => {
  it("spotlights the attachments button under its own key", () => {
    renderHook(() => useLineAttachmentsOnboardingHighlight(true, false));
    expect(spotlightMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: OnboardingKeys.EMISSION_CAPTURE_LINE_ATTACHMENTS,
        targetId: "emission-capture-line-attachments",
        isBlocked: false,
      })
    );
  });

  it("holds until there is a line to act on", () => {
    renderHook(() => useLineAttachmentsOnboardingHighlight(false, false));
    expect(lastCall().isBlocked).toBe(true);
  });

  it("holds while the expert-mode hint still owns the screen", () => {
    renderHook(() => useLineAttachmentsOnboardingHighlight(true, true));
    expect(lastCall().isBlocked).toBe(true);
  });
});
