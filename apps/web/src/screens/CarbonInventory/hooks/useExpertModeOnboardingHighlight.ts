import { OnboardingKeys } from "@repo/types";
import {
  useOnboardingSpotlight,
  type OnboardingSpotlight,
} from "@/hooks/useOnboardingSpotlight";

/**
 * First-visit-only spotlight for the "Sólo quiero ingresar el total de
 * emisiones" checkbox in the emission editor. Fires once the editor renders at
 * least one subcategory where expert mode is available.
 *
 * It is the first hint of the emission-capture screen: the per-line hints queue
 * behind the returned `isPending`. In a category without expert mode the hint
 * is not applicable rather than merely waiting, so that queue is released
 * instead of stalling. It is not retired, though: every visit starts on the
 * first category, and the hint still fires once the user reaches one that
 * offers expert mode.
 *
 * That ruling waits for the category data. Before it loads,
 * `isExpertModeAvailable` is false only because there is nothing to look at
 * yet — `ready` tracks the completion state, not the emission-capture query,
 * and an anonymous session is ready as soon as OIDC settles, without waiting on
 * any query at all. Ruling then would release the queue before this hint had
 * its turn, and the line hints could go first on a screen that offers it.
 */
export const useExpertModeOnboardingHighlight = (
  isExpertModeAvailable: boolean,
  isCategoryDataLoaded: boolean
): OnboardingSpotlight =>
  useOnboardingSpotlight({
    key: OnboardingKeys.EMISSION_CAPTURE_EXPERT_MODE,
    targetId: "emission-capture-expert-mode",
    title: "Ingresa sólo el total",
    description:
      "Marca esta casilla para registrar un único total de emisiones (tCO₂e) sin cargar fuente por fuente. No es obligatoria: si tienes el detalle, déjala desmarcada y agrega cada fuente de emisión.",
    isApplicable: isExpertModeAvailable,
    isBlocked: !isCategoryDataLoaded,
  });
