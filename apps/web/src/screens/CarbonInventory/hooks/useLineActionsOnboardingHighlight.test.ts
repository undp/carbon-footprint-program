import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { OnboardingKeys } from "@repo/types";
import { useLineActionsOnboardingHighlight } from "./useLineActionsOnboardingHighlight";

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

interface HookProps {
  hasCapturedLines: boolean;
  isExpertModeHintPending: boolean;
}

const setup = (opts: {
  ready?: boolean;
  completed?: string[];
  hasCapturedLines?: boolean;
  isExpertModeHintPending?: boolean;
}) => {
  const completed = new Set(opts.completed ?? []);
  useOnboardingCompletionMock.mockReturnValue({
    ready: opts.ready ?? true,
    isCompleted: (key: string) => completed.has(key),
    complete: completeMock,
  });
  let props: HookProps = {
    hasCapturedLines: opts.hasCapturedLines ?? true,
    isExpertModeHintPending: opts.isExpertModeHintPending ?? false,
  };
  const rendered = renderHook(
    (current: HookProps) =>
      useLineActionsOnboardingHighlight(
        current.hasCapturedLines,
        current.isExpertModeHintPending
      ),
    { initialProps: props }
  );
  // `rerender()` with no argument would hand the hook `undefined` props, so
  // every re-render goes through here and carries the previous ones forward.
  rerenderLatest = (next: Partial<HookProps> = {}) => {
    props = { ...props, ...next };
    rendered.rerender(props);
  };
  return { rerender: rerenderLatest, unmount: rendered.unmount };
};

/** Re-render of the hook most recently mounted by `setup`. */
let rerenderLatest: (next?: Partial<HookProps>) => void;

beforeEach(() => {
  vi.clearAllMocks();
  runHighlightMock.mockReturnValue(cleanupMock);
});

describe("useLineActionsOnboardingHighlight", () => {
  it("spotlights the line actions once a source is captured", () => {
    setup({});
    expect(runHighlightMock).toHaveBeenCalledTimes(1);
    expect(runHighlightMock.mock.calls[0][0]).toMatchObject({
      debugLabel: "emission-capture-line-actions",
      confirmLabel: "Entendido",
    });
  });

  it("waits for the completion state to settle", () => {
    // Firing while /me is still loading would re-show the hint to a user who
    // already dismissed it.
    setup({ ready: false });
    expect(runHighlightMock).not.toHaveBeenCalled();
  });

  it("does not fire before there is a line to act on", () => {
    setup({ hasCapturedLines: false });
    expect(runHighlightMock).not.toHaveBeenCalled();
  });

  it("does not fire once dismissed", () => {
    setup({ completed: [OnboardingKeys.EMISSION_CAPTURE_LINE_ACTIONS] });
    expect(runHighlightMock).not.toHaveBeenCalled();
  });

  it("stands down while the expert-mode hint is still pending", () => {
    // An inventory reopened with lines already captured would otherwise stack
    // two popovers on the same render.
    setup({ isExpertModeHintPending: true });
    expect(runHighlightMock).not.toHaveBeenCalled();
  });

  it("fires as soon as the expert-mode hint stops being pending", () => {
    // The reason the wait is a dep and not a ref read. Reopening an inventory
    // that already has lines settles `ready`/`hasCapturedLines` before the
    // expert-mode hint is dismissed, so its resolution is the ONLY thing left
    // to re-run this effect. Read the expert-mode completion through a ref
    // instead and nothing re-runs it: the hint sits out the whole mount.
    const { rerender } = setup({ isExpertModeHintPending: true });
    expect(runHighlightMock).not.toHaveBeenCalled();

    rerender({ isExpertModeHintPending: false });

    expect(runHighlightMock).toHaveBeenCalledTimes(1);
  });

  it("does not queue behind a hint that was never pending", () => {
    setup({ isExpertModeHintPending: false });
    expect(runHighlightMock).toHaveBeenCalledTimes(1);
  });

  it("runs at most once per mount", () => {
    const { rerender } = setup({});
    rerender();
    rerender();
    expect(runHighlightMock).toHaveBeenCalledTimes(1);
  });

  it("persists completion on explicit dismissal and on following the hint", () => {
    setup({});
    const spec = runHighlightMock.mock.calls[0][0] as {
      onUserClose: () => void;
      onFollow: () => void;
    };

    spec.onUserClose();
    spec.onFollow();

    expect(completeMock).toHaveBeenCalledTimes(2);
    expect(completeMock).toHaveBeenNthCalledWith(
      1,
      OnboardingKeys.EMISSION_CAPTURE_LINE_ACTIONS
    );
    expect(completeMock).toHaveBeenNthCalledWith(
      2,
      OnboardingKeys.EMISSION_CAPTURE_LINE_ACTIONS
    );
  });

  it("survives /me resolving while the popover is open", () => {
    // The reason `isCompleted`/`complete` are read through refs and kept out
    // of the effect's dep array. Their identities change when the completion
    // list refetches or `isAuthenticated` flips — which happens routinely
    // right after this hint appears. With them in the deps, that re-render
    // would run the effect's cleanup and tear down a live popover WITHOUT
    // persisting completion, so the hint would come back next visit.
    setup({});
    expect(runHighlightMock).toHaveBeenCalledTimes(1);

    // A fresh `useOnboardingCompletion` result: same values, new identities.
    useOnboardingCompletionMock.mockReturnValue({
      ready: true,
      isCompleted: () => false,
      complete: vi.fn(),
    });
    rerenderLatest();

    expect(cleanupMock).not.toHaveBeenCalled();
    expect(runHighlightMock).toHaveBeenCalledTimes(1);
  });

  it("tears the highlight down on unmount", () => {
    const { unmount } = setup({});
    unmount();
    expect(cleanupMock).toHaveBeenCalledTimes(1);
  });
});
