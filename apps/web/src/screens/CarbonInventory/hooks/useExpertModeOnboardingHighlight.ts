import { useEffect, useRef } from "react";
import { OnboardingKeys } from "@repo/types";
import { useOnboardingCompletion } from "@/hooks/useOnboardingCompletion";
import {
  findOnboardingTarget,
  runOnboardingHighlight,
} from "@/utils/onboardingHighlight";

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
 */
export const useExpertModeOnboardingHighlight = (
  isExpertModeAvailable: boolean
) => {
  const { isCompleted, complete, ready } = useOnboardingCompletion();
  const hasRunRef = useRef(false);

  useEffect(() => {
    // Never fire before `ready`: while OIDC rehydrates or /me loads the effective
    // completion state is unknown, and firing then would re-show the hint for a
    // returning user who already dismissed it.
    if (
      hasRunRef.current ||
      !ready ||
      isCompleted(OnboardingKeys.EMISSION_CAPTURE_EXPERT_MODE) ||
      !isExpertModeAvailable
    ) {
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
      onUserClose: () => complete(OnboardingKeys.EMISSION_CAPTURE_EXPERT_MODE),
      onFollow: () => complete(OnboardingKeys.EMISSION_CAPTURE_EXPERT_MODE),
    });
  }, [ready, isCompleted, complete, isExpertModeAvailable]);
};
