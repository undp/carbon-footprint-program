import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { OnboardingKeys } from "@repo/types";
import {
  useOnboardingSpotlight,
  type OnboardingSpotlightSpec,
} from "./useOnboardingSpotlight";

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

const KEY = OnboardingKeys.EMISSION_CAPTURE_EXPERT_MODE;
const completeMock = vi.fn();

const BASE_SPEC = {
  key: KEY,
  targetId: "emission-capture-expert-mode",
  title: "Ingresa sólo el total",
  description: "Marca esta casilla para registrar un único total de emisiones.",
} as const satisfies OnboardingSpotlightSpec;

type Gates = Pick<OnboardingSpotlightSpec, "isApplicable" | "isBlocked">;

const setup = (opts: {
  ready?: boolean;
  completed?: string[];
  isApplicable?: boolean;
  isBlocked?: boolean;
}) => {
  const completed = new Set(opts.completed ?? []);
  useOnboardingCompletionMock.mockReturnValue({
    ready: opts.ready ?? true,
    isCompleted: (key: string) => completed.has(key),
    complete: completeMock,
  });
  let gates: Gates = {
    isApplicable: opts.isApplicable ?? true,
    isBlocked: opts.isBlocked ?? false,
  };
  const rendered = renderHook(
    (current: Gates) => useOnboardingSpotlight({ ...BASE_SPEC, ...current }),
    { initialProps: gates }
  );
  // `rerender()` with no argument would hand the hook `undefined` props, so
  // every re-render goes through here and carries the previous ones forward.
  const rerender = (next: Partial<Gates> = {}) => {
    gates = { ...gates, ...next };
    rendered.rerender(gates);
  };
  return { result: rendered.result, rerender, unmount: rendered.unmount };
};

/** The spec handed to the mocked `runOnboardingHighlight`. */
const lastSpec = () =>
  runHighlightMock.mock.calls[0][0] as {
    find: () => HTMLElement | null;
    onDismiss: () => void;
    onUserClose: () => void;
    onFollow: () => void;
  };

beforeEach(() => {
  vi.clearAllMocks();
  runHighlightMock.mockReturnValue(cleanupMock);
});

describe("useOnboardingSpotlight", () => {
  it("spotlights the tagged control", () => {
    setup({});
    expect(runHighlightMock).toHaveBeenCalledTimes(1);
    expect(runHighlightMock.mock.calls[0][0]).toMatchObject({
      title: BASE_SPEC.title,
      description: BASE_SPEC.description,
      debugLabel: BASE_SPEC.targetId,
      confirmLabel: "Entendido",
    });
    expect(lastSpec().find()).toMatchObject({ id: BASE_SPEC.targetId });
  });

  it("waits for the completion state to settle", () => {
    // Firing while /me is still loading would re-show the hint to a user who
    // already dismissed it.
    const { result } = setup({ ready: false });
    expect(runHighlightMock).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(true);
  });

  it("does not fire once dismissed on an earlier visit", () => {
    const { result } = setup({ completed: [KEY] });
    expect(runHighlightMock).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);
  });

  it("runs at most once per mount", () => {
    const { rerender } = setup({});
    rerender();
    rerender();
    expect(runHighlightMock).toHaveBeenCalledTimes(1);
  });

  it("persists completion on explicit dismissal and on following the hint", () => {
    setup({});

    lastSpec().onUserClose();
    lastSpec().onFollow();

    expect(completeMock).toHaveBeenCalledTimes(2);
    expect(completeMock).toHaveBeenNthCalledWith(1, KEY);
    expect(completeMock).toHaveBeenNthCalledWith(2, KEY);
  });

  it("survives /me resolving while the popover is open", () => {
    // The reason `isCompleted`/`complete` are read through refs and kept out
    // of the effect's dep array. Their identities change when the completion
    // list refetches or `isAuthenticated` flips — which happens routinely
    // right after a hint appears. With them in the deps, that re-render would
    // run the effect's cleanup and tear down a live popover WITHOUT persisting
    // completion, so the hint would come back next visit.
    const { rerender } = setup({});
    expect(runHighlightMock).toHaveBeenCalledTimes(1);

    // A fresh `useOnboardingCompletion` result: same values, new identities.
    useOnboardingCompletionMock.mockReturnValue({
      ready: true,
      isCompleted: () => false,
      complete: vi.fn(),
    });
    rerender();

    expect(cleanupMock).not.toHaveBeenCalled();
    expect(runHighlightMock).toHaveBeenCalledTimes(1);
  });

  it("tears the highlight down on unmount", () => {
    const { unmount } = setup({});
    unmount();
    expect(cleanupMock).toHaveBeenCalledTimes(1);
  });

  describe("isBlocked", () => {
    it("holds the hint without ruling it out", () => {
      const { result } = setup({ isBlocked: true });
      expect(runHighlightMock).not.toHaveBeenCalled();
      // Still pending, so anything queued behind it keeps waiting too.
      expect(result.current.isPending).toBe(true);
    });

    it("fires as soon as the block lifts", () => {
      // The reason a caller chains on `isPending` instead of reading the
      // blocking hint's completion through a ref. Reopening a screen whose
      // triggers are already settled leaves the block as the ONLY thing that
      // can re-run this effect; a ref read never re-runs it, so the hint would
      // sit out the whole mount and only appear on a later visit.
      const { rerender } = setup({ isBlocked: true });
      expect(runHighlightMock).not.toHaveBeenCalled();

      rerender({ isBlocked: false });

      expect(runHighlightMock).toHaveBeenCalledTimes(1);
    });

    it("keeps an already-seen hint pending until its turn comes", () => {
      // Resolving it while blocked would release the queue behind it while the
      // hint ahead is still on screen, and the next one would open on top.
      const { result, rerender } = setup({ completed: [KEY], isBlocked: true });
      expect(result.current.isPending).toBe(true);

      rerender({ isBlocked: false });

      expect(result.current.isPending).toBe(false);
      expect(runHighlightMock).not.toHaveBeenCalled();
    });
  });

  describe("isApplicable", () => {
    it("resolves the hint instead of holding the queue", () => {
      // A hint that can never show here must not strand the ones behind it.
      const { result } = setup({ isApplicable: false });
      expect(runHighlightMock).not.toHaveBeenCalled();
      expect(result.current.isPending).toBe(false);
    });

    it("stays ruled out when it becomes applicable later in the visit", () => {
      // The queue behind it has already moved on, so firing now would land on
      // top of whichever hint took its place.
      const { rerender } = setup({ isApplicable: false });

      rerender({ isApplicable: true });

      expect(runHighlightMock).not.toHaveBeenCalled();
    });

    it("is not ruled out while it is blocked", () => {
      // "Not applicable yet" — data still loading — has to wait in `isBlocked`
      // instead of being taken as final.
      const { result, rerender } = setup({
        isApplicable: false,
        isBlocked: true,
      });
      expect(result.current.isPending).toBe(true);

      rerender({ isApplicable: true, isBlocked: false });

      expect(runHighlightMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("isPending", () => {
    it("stays true while the popover is up and clears when it ends", () => {
      const { result } = setup({});
      expect(result.current.isPending).toBe(true);

      act(() => lastSpec().onDismiss());

      expect(result.current.isPending).toBe(false);
    });
  });
});
