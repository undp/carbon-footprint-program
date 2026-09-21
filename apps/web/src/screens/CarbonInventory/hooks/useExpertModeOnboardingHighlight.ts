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
 * behind the returned `isPending`. Where expert mode isn't offered at all the
 * hint is not applicable rather than merely waiting, so that queue is released
 * right away instead of stalling on a hint that will never show.
 */
export const useExpertModeOnboardingHighlight = (
  isExpertModeAvailable: boolean
): OnboardingSpotlight =>
  useOnboardingSpotlight({
    key: OnboardingKeys.EMISSION_CAPTURE_EXPERT_MODE,
    targetId: "emission-capture-expert-mode",
    title: "Ingresa sólo el total",
    description:
      "Marca esta casilla para registrar un único total de emisiones (tCO₂e) sin cargar fuente por fuente. No es obligatoria: si tienes el detalle, déjala desmarcada y agrega cada fuente de emisión.",
    isApplicable: isExpertModeAvailable,
  });
