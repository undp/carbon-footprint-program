import { useEffect, useRef } from "react";
import { OnboardingKeys } from "@repo/types";
import { useOnboardingCompletion } from "@/hooks/useOnboardingCompletion";
import {
  findOnboardingTarget,
  runOnboardingHighlight,
} from "@/utils/onboardingHighlight";

/**
 * First-visit-only spotlight for the per-line actions of the emission editor —
 * "Adjuntar archivos" and "Agregar información adicional".
 *
 * Both controls went unnoticed in the verifier review of the demo: the eye
 * travels to the continue button and skips the row of icons, so the two places
 * where a declaration's backing evidence and the source of an own factor are
 * meant to live stayed empty. The reviewers asked for the same spotlight the
 * expert-mode checkbox already gets, which is what this reuses.
 *
 * Fires once there is at least one visible line in the selected category, since
 * the actions only exist on a line. It also queues behind the expert-mode hint
 * (`isExpertModeHintPending`): an inventory reopened with lines already
 * captured would otherwise show two popovers at once, and that hint owns the
 * first visit.
 *
 * That wait is a DEP, not a ref read, and deliberately so. The expert-mode
 * completion is the same fact, but reading it through `isCompletedRef` would
 * never re-run this effect: dismissing that hint persists completion (a `/me`
 * invalidation when authenticated, a localStorage write when anonymous) without
 * touching `ready`, `hasCapturedLines` or the gate itself, so this hint would
 * sit out the whole mount and only appear on a later visit.
 *
 * Completion, the `hasRunRef` guard and the latest-value refs follow
 * `useExpertModeOnboardingHighlight` exactly — including keeping
 * `isCompleted`/`complete` out of the dep array. Their identities change when
 * `/me`'s completion list updates or `isAuthenticated` flips, and if that
 * happened while the popover was open the effect cleanup would tear down a live
 * highlight WITHOUT persisting completion, so it would reappear next visit.
 */
export const useLineActionsOnboardingHighlight = (
  hasCapturedLines: boolean,
  isExpertModeHintPending: boolean
) => {
  const { isCompleted, complete, ready } = useOnboardingCompletion();
  const hasRunRef = useRef(false);

  const isCompletedRef = useRef(isCompleted);
  const completeRef = useRef(complete);
  useEffect(() => {
    isCompletedRef.current = isCompleted;
    completeRef.current = complete;
  });

  useEffect(() => {
    // Never fire before `ready`: while OIDC rehydrates or /me loads the
    // effective completion state is unknown, and firing then would re-show the
    // hint to a user who already dismissed it.
    if (
      hasRunRef.current ||
      !ready ||
      !hasCapturedLines ||
      isExpertModeHintPending ||
      isCompletedRef.current(OnboardingKeys.EMISSION_CAPTURE_LINE_ACTIONS)
    ) {
      return undefined;
    }
    hasRunRef.current = true;
    return runOnboardingHighlight({
      find: findOnboardingTarget("emission-capture-line-actions"),
      title: "Respalda y explica cada fuente",
      description:
        "Con estos botones adjuntas los archivos que respaldan la fuente y agregas información adicional. Si usas un factor propio, anota ahí de dónde lo sacaste: quien verifique tu huella necesita poder llegar a esa fuente para reproducir el cálculo.",
      debugLabel: "emission-capture-line-actions",
      confirmLabel: "Entendido",
      onUserClose: () =>
        completeRef.current(OnboardingKeys.EMISSION_CAPTURE_LINE_ACTIONS),
      onFollow: () =>
        completeRef.current(OnboardingKeys.EMISSION_CAPTURE_LINE_ACTIONS),
    });
  }, [ready, hasCapturedLines, isExpertModeHintPending]);
};
