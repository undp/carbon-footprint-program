import { useEffect, useRef, useState } from "react";
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
   * False when the hint can never apply on this screen — the control it points
   * at doesn't exist here at all. Resolves the hint immediately (see
   * `isPending`) instead of leaving whatever queued behind it waiting forever.
   * Defaults to true.
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
    if (isCompletedRef.current(key) || !isApplicable) {
      // Resolved without showing anything — release whatever queued behind it.
      setIsPending(false);
      return undefined;
    }
    // Still its turn to wait: stay pending so the queue behind it holds too.
    if (isBlocked) return undefined;
    hasRunRef.current = true;
    return runOnboardingHighlight({
      find: findOnboardingTarget(targetId),
      title,
      description,
      debugLabel: targetId,
      confirmLabel: "Entendido",
      // Runs on every ending — user close, following the hint, teardown, and
      // the poll giving up on a target that never rendered — so a queued hint
      // is released even on the paths that persist nothing.
      onDismiss: () => setIsPending(false),
      onUserClose: () => completeRef.current(key),
      onFollow: () => completeRef.current(key),
    });
  }, [ready, key, targetId, title, description, isApplicable, isBlocked]);

  return { isPending };
};
