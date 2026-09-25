import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { OnboardingKey } from "@repo/types";
import { useOnboardingCompletion } from "@/hooks/useOnboardingCompletion";
import {
  findOnboardingTarget,
  runOnboardingHighlight,
  type OnboardingFocus,
} from "@/utils/onboardingHighlight";

export interface OnboardingSpotlightSpec {
  /** Persisted completion key: the hint is shown at most once, ever. */
  key: OnboardingKey;
  /** `data-onboarding-id` of the control to spotlight. */
  targetId: OnboardingFocus;
  title: string;
  description: string;
  /**
   * False while the control the hint points at doesn't exist in what the
   * screen shows — e.g. a category without it. Releases the queue behind the
   * hint (see `isPending`) instead of leaving it waiting, but does not retire
   * the hint: if it turns true later in the visit (a category switch), the
   * hint still fires, as soon as no other spotlight holds the screen.
   * Defaults to true.
   *
   * It is only read once `isBlocked` is false. A condition that is merely
   * "not yet" — data still loading — belongs in `isBlocked`, or the queue is
   * released before this hint had its turn.
   */
  isApplicable?: boolean;
  /**
   * True while the hint must hold: its trigger hasn't happened yet, or another
   * hint still owns the screen. Unlike `isApplicable: false` this keeps the
   * hint pending, so a hint queued behind it stays queued too. Defaults to
   * false.
   */
  isBlocked?: boolean;
}

export interface OnboardingSpotlight {
  /**
   * True while this hint may still take over the screen: before the completion
   * state settles, while it waits its turn, and while its popover is up. Flips
   * to false as soon as it is resolved one way or another — dismissed,
   * followed, already seen, not applicable, or its target never rendered.
   *
   * "Not applicable" does not stay final, so this is an ordering signal, not
   * the stacking guard: a hint that fires later in the visit, after its queue
   * moved on, is kept off a live popover by the shared active-spotlight store
   * below.
   *
   * Chain it into the next hint's `isBlocked` to show several hints on one
   * screen in order. It has to be reactive state rather than a completion
   * read: dismissing a hint persists completion and changes `isCompleted`'s
   * identity, but it changes none of the waiting effect's deps, so a ref read
   * would never re-run that effect and the queued hint would be silently
   * pushed to the next visit.
   */
  isPending: boolean;
}

/**
 * The spotlight on screen right now, shared by every `useOnboardingSpotlight`
 * so no two ever open at once. A store rather than a per-hook `isOpen` state
 * for two reasons. It is read synchronously: when a category switch makes two
 * hints fire in the same commit, the second one's effect must already see the
 * first one's claim, and a state update only lands on the next render. And it
 * is subscribed to: a hint held back by it has to re-run its effect when the
 * spotlight ends, which a plain module flag would never trigger.
 */
let activeSpotlight: OnboardingKey | null = null;
const activeSpotlightListeners = new Set<() => void>();

const setActiveSpotlight = (next: OnboardingKey | null) => {
  activeSpotlight = next;
  activeSpotlightListeners.forEach((listener) => listener());
};

const subscribeToActiveSpotlight = (listener: () => void) => {
  activeSpotlightListeners.add(listener);
  return () => {
    activeSpotlightListeners.delete(listener);
  };
};

const getActiveSpotlight = () => activeSpotlight;

/**
 * One first-visit-only driver.js spotlight, persisted so it never comes back.
 *
 * Completion is session-agnostic (see useOnboardingCompletion): anonymous
 * dismissals persist in localStorage and are merged into the DB on login, so a
 * hint never resurfaces regardless of session state.
 *
 * The `hasRunRef` guard keeps it to a single attempt per mount, and
 * `runOnboardingHighlight` polls the DOM for the tagged control, so callers
 * don't need to wait on mount timing.
 *
 * Persistence fires on both explicit dismissal (`onUserClose` — the "Entendido"
 * acknowledge button, ✕, overlay, or Esc; the button routes through the same
 * close path) and following the hint (`onFollow` — clicking the spotlighted
 * control), so the "first-visit-only" promise holds however the user engages.
 * We deliberately do NOT persist on the effect cleanup/unmount path, so an
 * accidental navigation away doesn't silently burn the one-time hint.
 *
 * `isCompleted`/`complete` are read through refs rather than the dep array:
 * their identities change when `/me`'s completion list updates or
 * `isAuthenticated` flips, and if that happened while the popover was open the
 * effect cleanup would run `runOnboardingHighlight`'s teardown (`selfDestroy`,
 * so no `onUserClose`), silently dismissing a live highlight WITHOUT persisting
 * completion — it would then reappear next visit. `hasRunRef` guards
 * re-firing, not re-teardown, so the fix is to keep those identities out of the
 * deps. For the same reason the copy must be stable across renders; every
 * caller passes literals.
 */
export const useOnboardingSpotlight = ({
  key,
  targetId,
  title,
  description,
  isApplicable = true,
  isBlocked = false,
}: OnboardingSpotlightSpec): OnboardingSpotlight => {
  const { isCompleted, complete, ready } = useOnboardingCompletion();
  const hasRunRef = useRef(false);
  // Starts pending: until `ready`, whether this hint will show is unknown, and
  // a hint queued behind it must not jump ahead of that answer.
  const [isPending, setIsPending] = useState(true);
  // Only "someone else holds the screen" is a dep, never the owner itself:
  // claiming the store must not re-run this hint's own effect, whose cleanup
  // would tear down the popover it just opened.
  const activeKey = useSyncExternalStore(
    subscribeToActiveSpotlight,
    getActiveSpotlight
  );
  const isAnotherSpotlightOpen = activeKey !== null && activeKey !== key;

  // Latest-value refs so the highlight effect can call the current
  // `isCompleted`/`complete` without listing them as deps (see the block
  // comment above). Synced in an effect (not during render) and declared before
  // the highlight effect, so the refs are current before that effect reads them.
  const isCompletedRef = useRef(isCompleted);
  const completeRef = useRef(complete);
  useEffect(() => {
    isCompletedRef.current = isCompleted;
    completeRef.current = complete;
  });

  useEffect(() => {
    // Never decide before `ready`: while OIDC rehydrates or /me loads the
    // effective completion state is unknown, and firing then would re-show the
    // hint to a user who already dismissed it. Once `hasRunRef` is set the
    // highlight is live or finished, and `onDismiss` owns `isPending`.
    if (hasRunRef.current || !ready) return undefined;
    // Not its turn yet: stay pending so the queue behind it holds too. This is
    // checked BEFORE the hint is resolved, not after: a hint already seen, or
    // one that doesn't apply, would otherwise release its queue while the hint
    // ahead of it is still on screen — and the next one would open on top.
    if (isBlocked) return undefined;
    const isAlreadySeen = isCompletedRef.current(key);
    if (isAlreadySeen || !isApplicable) {
      // Resolved without showing anything — release whatever queued behind it.
      // Only "already seen" is final. "Not applicable" leaves `hasRunRef`
      // unset: every visit mounts on the first category, so ruling the hint
      // out for the mount would lose it for good whenever that category lacks
      // its control.
      if (isAlreadySeen) hasRunRef.current = true;
      setIsPending(false);
      return undefined;
    }
    // Read live, not through `activeKey`: a hint earlier in the same commit
    // may have just claimed the screen, and this render has not seen it yet.
    if (getActiveSpotlight() !== null) return undefined;
    hasRunRef.current = true;
    setActiveSpotlight(key);
    const releaseScreen = () => {
      if (getActiveSpotlight() === key) setActiveSpotlight(null);
    };
    const teardown = runOnboardingHighlight({
      find: findOnboardingTarget(targetId),
      title,
      description,
      debugLabel: targetId,
      confirmLabel: "Entendido",
      // Runs on every ending — user close, following the hint, teardown, and
      // the poll giving up on a target that never rendered — so a queued hint
      // is released even on the paths that persist nothing.
      onDismiss: () => {
        releaseScreen();
        setIsPending(false);
      },
      onUserClose: () => completeRef.current(key),
      onFollow: () => completeRef.current(key),
    });
    return () => {
      teardown();
      releaseScreen();
    };
  }, [
    ready,
    key,
    targetId,
    title,
    description,
    isApplicable,
    isBlocked,
    isAnotherSpotlightOpen,
  ]);

  return { isPending };
};
