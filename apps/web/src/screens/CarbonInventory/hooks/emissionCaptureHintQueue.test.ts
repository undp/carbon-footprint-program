import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { OnboardingKeys } from "@repo/types";
import { useExpertModeOnboardingHighlight } from "./useExpertModeOnboardingHighlight";
import { useLineAttachmentsOnboardingHighlight } from "./useLineAttachmentsOnboardingHighlight";
import { useLineExtraInfoOnboardingHighlight } from "./useLineExtraInfoOnboardingHighlight";

const { useOnboardingCompletionMock, runHighlightMock } = vi.hoisted(() => ({
  useOnboardingCompletionMock: vi.fn(),
  runHighlightMock: vi.fn(),
}));

vi.mock("@/hooks/useOnboardingCompletion", () => ({
  useOnboardingCompletion: useOnboardingCompletionMock,
}));
vi.mock("@/utils/onboardingHighlight", () => ({
  runOnboardingHighlight: runHighlightMock,
  findOnboardingTarget: (id: string) => () =>
    ({ id }) as unknown as HTMLElement,
}));

interface ScreenState {
  isCategoryDataLoaded: boolean;
  isExpertModeAvailable: boolean;
  hasCapturedLines: boolean;
}

/**
 * The three hints chained exactly as EmissionCaptureScreen chains them. Each
 * test drives the screen's inputs and asserts which popovers are open — the
 * property under test is that there is never more than one at a time.
 */
const renderQueue = (initial: ScreenState, completed: string[] = []) => {
  const done = new Set(completed);
  useOnboardingCompletionMock.mockReturnValue({
    ready: true,
    isCompleted: (key: string) => done.has(key),
    // Deliberately a no-op: a signed-in dismissal only reaches `isCompleted`
    // after the POST and the `/me` refetch, so the queue must not depend on it.
    complete: vi.fn(),
  });
  return renderHook(
    (state: ScreenState) => {
      const expert = useExpertModeOnboardingHighlight(
        state.isExpertModeAvailable,
        state.isCategoryDataLoaded
      );
      const attachments = useLineAttachmentsOnboardingHighlight(
        state.hasCapturedLines,
        expert.isPending
      );
      useLineExtraInfoOnboardingHighlight(
        state.hasCapturedLines,
        attachments.isPending
      );
    },
    { initialProps: initial }
  );
};

/** `debugLabel` of every popover opened so far, in order. */
const opened = () =>
  runHighlightMock.mock.calls.map(
    ([spec]) => (spec as { debugLabel: string }).debugLabel
  );

/** Ends the popover opened at `index`, the way driver.js does on close. */
const dismiss = (index: number) =>
  act(() => {
    (
      runHighlightMock.mock.calls[index][0] as { onDismiss: () => void }
    ).onDismiss();
  });

const LOADED_WITH_LINES: ScreenState = {
  isCategoryDataLoaded: true,
  isExpertModeAvailable: true,
  hasCapturedLines: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  runHighlightMock.mockReturnValue(vi.fn());
});

describe("emission-capture hint queue", () => {
  it("opens one hint when the data arrives after the completion state", () => {
    // `ready` only waits for OIDC and `/me`, not for the emission-capture
    // query. Ruling expert mode out while the data was still loading released
    // the queue, and the data arriving then opened expert mode and attachments
    // in the same render.
    const { rerender } = renderQueue({
      isCategoryDataLoaded: false,
      isExpertModeAvailable: false,
      hasCapturedLines: false,
    });
    expect(opened()).toEqual([]);

    rerender(LOADED_WITH_LINES);

    expect(opened()).toEqual(["emission-capture-expert-mode"]);
  });

  it("does not let an already-seen hint release the queue early", () => {
    // Attachments dismissed on an earlier visit, expert mode not: resolving
    // attachments straight away would open extra-info on top of expert mode.
    renderQueue(LOADED_WITH_LINES, [
      OnboardingKeys.EMISSION_CAPTURE_LINE_ATTACHMENTS,
    ]);

    expect(opened()).toEqual(["emission-capture-expert-mode"]);
  });

  it("opens expert mode on a later category once the line hints are done", () => {
    // Review finding: every visit mounts on category 1, so when it offers no
    // expert mode the hint was ruled out for the mount and never shown.
    const { rerender } = renderQueue({
      isCategoryDataLoaded: true,
      isExpertModeAvailable: false,
      hasCapturedLines: true,
    });
    expect(opened()).toEqual(["emission-capture-line-attachments"]);
    dismiss(0);
    expect(opened()).toEqual([
      "emission-capture-line-attachments",
      "emission-capture-line-extra-info",
    ]);
    dismiss(1);

    // Switch to a category that offers expert mode.
    rerender(LOADED_WITH_LINES);

    expect(opened()).toEqual([
      "emission-capture-line-attachments",
      "emission-capture-line-extra-info",
      "emission-capture-expert-mode",
    ]);
  });

  it("holds expert mode while a line hint is on screen", () => {
    const { rerender } = renderQueue({
      isCategoryDataLoaded: true,
      isExpertModeAvailable: false,
      hasCapturedLines: true,
    });
    expect(opened()).toEqual(["emission-capture-line-attachments"]);

    rerender(LOADED_WITH_LINES);
    expect(opened()).toEqual(["emission-capture-line-attachments"]);

    // Expert mode goes next: it is declared first, so it claims the screen
    // before extra-info does.
    dismiss(0);
    expect(opened()).toEqual([
      "emission-capture-line-attachments",
      "emission-capture-expert-mode",
    ]);

    dismiss(1);
    expect(opened()).toEqual([
      "emission-capture-line-attachments",
      "emission-capture-expert-mode",
      "emission-capture-line-extra-info",
    ]);
  });

  it("opens one hint when a category switch unblocks two at once", () => {
    // Category 1 has neither expert mode nor lines, so the queue is released
    // with nothing on screen. Category 2 has both: expert mode and the
    // attachments hint unblock in the same render, before either one's
    // `isPending` has updated.
    const { rerender } = renderQueue({
      isCategoryDataLoaded: true,
      isExpertModeAvailable: false,
      hasCapturedLines: false,
    });
    expect(opened()).toEqual([]);

    rerender(LOADED_WITH_LINES);

    expect(opened()).toEqual(["emission-capture-expert-mode"]);
  });

  it("moves on as soon as a hint is dismissed, without waiting for /me", () => {
    // Review finding: a signed-in user who dismissed expert mode and added a
    // source before the `/me` round-trip lost the line hints for the visit.
    // `complete` is a no-op here, so `isCompleted` never catches up.
    const { rerender } = renderQueue({
      ...LOADED_WITH_LINES,
      hasCapturedLines: false,
    });
    expect(opened()).toEqual(["emission-capture-expert-mode"]);
    dismiss(0);

    rerender(LOADED_WITH_LINES);
    expect(opened()).toEqual([
      "emission-capture-expert-mode",
      "emission-capture-line-attachments",
    ]);

    dismiss(1);
    expect(opened()).toEqual([
      "emission-capture-expert-mode",
      "emission-capture-line-attachments",
      "emission-capture-line-extra-info",
    ]);
  });
});
