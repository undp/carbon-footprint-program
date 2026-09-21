import { useEffect, useRef, useState } from "react";
import { OnboardingKeys } from "@repo/types";
import { useOnboardingCompletion } from "@/hooks/useOnboardingCompletion";
import {
  findOnboardingTarget,
  runOnboardingHighlight,
} from "@/utils/onboardingHighlight";

interface ExpertModeOnboardingHighlight {
  /**
   * True while this hint may still take over the screen: before the completion
   * state settles, and while its popover is up. Flips to false as soon as the
   * hint is resolved one way or another — dismissed, followed, already seen,
   * not available here, or its target never rendered.
   *
   * It exists so a second hint on the same screen can queue behind this one
   * REACTIVELY (see useLineActionsOnboardingHighlight). Reading the expert-mode
   * completion through a ref instead would leave that hint stuck: dismissing
   * this one persists completion and changes `isCompleted`'s identity, but it
   * changes none of the waiting effect's deps, so the effect never re-runs and
   * the queued hint is silently pushed to the next visit.
   */
  isPending: boolean;
}

/**
 * First-visit-only spotlight for the "Sólo quiero ingresar el total de
 * emisiones" checkbox in the emission editor. Fires automatically once the
 * emission editor renders at least one subcategory where expert mode is
 * available, provided the user hasn't already dismissed it.
 *
 * Completion is session-agnostic (see useOnboardingCompletion): anonymous
 * dismissals persist in localStorage and are merged into the DB on login, so the
 * hint never resurfaces regardless of session state.
 *
 * The `hasRunRef` guard keeps it to a single attempt per mount, and
 * `runOnboardingHighlight` polls the DOM for the tagged control, so we don't
 * need to wait on subcategory mount timing here.
 *
 * Persistence fires on both explicit dismissal (`onUserClose` — the "Entendido"
 * acknowledge button, ✕, overlay, or Esc; the button routes through the same
 * close path) and following the hint (`onFollow` — clicking the spotlighted
 * checkbox), so the "first-visit-only" promise holds however the user engages.
 * We deliberately do NOT persist on the effect cleanup/unmount path, so an
 * accidental navigation away doesn't silently burn the one-time hint.
 *
 * The effect depends ONLY on the real triggers `[ready, isExpertModeAvailable]`.
 * `isCompleted`/`complete` are read through refs instead of the dep array: their
 * identities change when `/me`'s completion list updates or `isAuthenticated`
 * flips, and if that happened while the popover was open the effect cleanup would
 * run `runOnboardingHighlight`'s teardown (`selfDestroy`, so no `onUserClose`),
 * silently dismissing a live highlight WITHOUT persisting completion — it would
 * then reappear next visit. `hasRunRef` guards re-firing, not re-teardown, so the
 * fix is to keep those identities out of the deps.
 */
export const useExpertModeOnboardingHighlight = (
  isExpertModeAvailable: boolean
): ExpertModeOnboardingHighlight => {
  const { isCompleted, complete, ready } = useOnboardingCompletion();
  const hasRunRef = useRef(false);
  // Starts pending: until `ready`, whether this hint will show is unknown, and
  // a hint queued behind it must not jump ahead of that answer.
  const [isPending, setIsPending] = useState(true);

  // Latest-value refs so the highlight effect can call the current
  // `isCompleted`/`complete` without listing them as deps (see the block comment
  // above). Synced in an effect (not during render) and declared before the
  // highlight effect, so the refs are current before that effect reads them.
  const isCompletedRef = useRef(isCompleted);
  const completeRef = useRef(complete);
  useEffect(() => {
    isCompletedRef.current = isCompleted;
    completeRef.current = complete;
  });

  useEffect(() => {
    // Never fire before `ready`: while OIDC rehydrates or /me loads the effective
    // completion state is unknown, and firing then would re-show the hint for a
    // returning user who already dismissed it. `hasRunRef` means the highlight is
    // already live or finished, and `onDismiss` owns `isPending` from then on.
    if (hasRunRef.current || !ready) return undefined;
    if (
      isCompletedRef.current(OnboardingKeys.EMISSION_CAPTURE_EXPERT_MODE) ||
      !isExpertModeAvailable
    ) {
      // Ruled out for this visit — release anything queued behind it.
      setIsPending(false);
      return undefined;
    }
    hasRunRef.current = true;
    return runOnboardingHighlight({
      find: findOnboardingTarget("emission-capture-expert-mode"),
      title: "Ingresa sólo el total",
      description:
        "Marca esta casilla para registrar un único total de emisiones (tCO₂e) sin cargar fuente por fuente. No es obligatoria: si tienes el detalle, déjala desmarcada y agrega cada fuente de emisión.",
      debugLabel: "emission-capture-expert-mode",
      confirmLabel: "Entendido",
      // Runs on every ending — user close, following the hint, teardown, and the
      // poll giving up on a target that never rendered — so a queued hint is
      // released even on the paths that persist nothing.
      onDismiss: () => setIsPending(false),
      onUserClose: () =>
        completeRef.current(OnboardingKeys.EMISSION_CAPTURE_EXPERT_MODE),
      onFollow: () =>
        completeRef.current(OnboardingKeys.EMISSION_CAPTURE_EXPERT_MODE),
    });
  }, [ready, isExpertModeAvailable]);

  return { isPending };
};
