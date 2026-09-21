import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { OnboardingKeys } from "@repo/types";
import { useExpertModeOnboardingHighlight } from "./useExpertModeOnboardingHighlight";

const { useOnboardingCompletionMock, runHighlightMock, cleanupMock } =
  vi.hoisted(() => ({
    useOnboardingCompletionMock: vi.fn(),
    runHighlightMock: vi.fn(),
    cleanupMock: vi.fn(),
  }));

vi.mock("@/hooks/useOnboardingCompletion", () => ({
  useOnboardingCompletion: useOnboardingCompletionMock,
}));
vi.mock("@/utils/onboardingHighlight", () => ({
  runOnboardingHighlight: runHighlightMock,
  findOnboardingTarget: (id: string) => () =>
    ({ id }) as unknown as HTMLElement,
}));

const completeMock = vi.fn();

const setup = (opts: {
  ready?: boolean;
  completed?: string[];
  isExpertModeAvailable?: boolean;
}) => {
  const completed = new Set(opts.completed ?? []);
  useOnboardingCompletionMock.mockReturnValue({
    ready: opts.ready ?? true,
    isCompleted: (key: string) => completed.has(key),
    complete: completeMock,
  });
  return renderHook(() =>
    useExpertModeOnboardingHighlight(opts.isExpertModeAvailable ?? true)
  );
};

/** The spec handed to the mocked `runOnboardingHighlight`. */
const lastSpec = () =>
  runHighlightMock.mock.calls[0][0] as {
    onDismiss: () => void;
    onUserClose: () => void;
    onFollow: () => void;
  };

beforeEach(() => {
  vi.clearAllMocks();
  runHighlightMock.mockReturnValue(cleanupMock);
});

describe("useExpertModeOnboardingHighlight", () => {
  it("spotlights the expert-mode checkbox when it is available", () => {
    const { result } = setup({});
    expect(runHighlightMock).toHaveBeenCalledTimes(1);
    expect(runHighlightMock.mock.calls[0][0]).toMatchObject({
      debugLabel: "emission-capture-expert-mode",
      confirmLabel: "Entendido",
    });
    // Still occupying the screen, so anything queued behind it must wait.
    expect(result.current.isPending).toBe(true);
  });

  it("persists completion on explicit dismissal and on following the hint", () => {
    setup({});
    lastSpec().onUserClose();
    lastSpec().onFollow();

    expect(completeMock).toHaveBeenCalledTimes(2);
    expect(completeMock).toHaveBeenNthCalledWith(
      1,
      OnboardingKeys.EMISSION_CAPTURE_EXPERT_MODE
    );
  });

  describe("isPending", () => {
    // The signal a second hint on the same screen queues behind. It has to be
    // reactive state rather than a completion read: dismissing this hint does
    // not change the waiting effect's deps, so a ref read would strand it.
    it("stays pending while the completion state is still settling", () => {
      const { result } = setup({ ready: false });
      expect(runHighlightMock).not.toHaveBeenCalled();
      expect(result.current.isPending).toBe(true);
    });

    it("clears once the highlight ends", () => {
      const { result } = setup({});
      expect(result.current.isPending).toBe(true);

      act(() => lastSpec().onDismiss());

      expect(result.current.isPending).toBe(false);
    });

    it("clears when the hint was already dismissed on an earlier visit", () => {
      const { result } = setup({
        completed: [OnboardingKeys.EMISSION_CAPTURE_EXPERT_MODE],
      });
      expect(runHighlightMock).not.toHaveBeenCalled();
      expect(result.current.isPending).toBe(false);
    });

    it("clears when expert mode is not available here", () => {
      const { result } = setup({ isExpertModeAvailable: false });
      expect(runHighlightMock).not.toHaveBeenCalled();
      expect(result.current.isPending).toBe(false);
    });
  });

  it("tears the highlight down on unmount", () => {
    const { unmount } = setup({});
    unmount();
    expect(cleanupMock).toHaveBeenCalledTimes(1);
  });
});
