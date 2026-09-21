import { OnboardingKeys } from "@repo/types";
import {
  useOnboardingSpotlight,
  type OnboardingSpotlight,
} from "@/hooks/useOnboardingSpotlight";

/**
 * First-visit-only spotlight for "Agregar información adicional", the second of
 * the two per-line actions of the emission editor.
 *
 * Last hint of the screen: it waits for a visible line and for the attachments
 * hint to be resolved, so the two per-line buttons are explained one at a time
 * and in the order they sit in the row.
 */
export const useLineExtraInfoOnboardingHighlight = (
  hasCapturedLines: boolean,
  isAttachmentsHintPending: boolean
): OnboardingSpotlight =>
  useOnboardingSpotlight({
    key: OnboardingKeys.EMISSION_CAPTURE_LINE_EXTRA_INFO,
    targetId: "emission-capture-line-extra-info",
    title: "Explica lo que el dato no dice",
    description:
      "Con este botón agregas información adicional sobre la fuente: un supuesto, una aclaración o cómo estimaste la cantidad. Si usas un factor de emisión propio, anota ahí de dónde lo sacaste: quien verifique tu huella necesita poder llegar a esa fuente para reproducir el cálculo.",
    isBlocked: !hasCapturedLines || isAttachmentsHintPending,
  });
