import { OnboardingKeys } from "@repo/types";
import {
  useOnboardingSpotlight,
  type OnboardingSpotlight,
} from "@/hooks/useOnboardingSpotlight";

/**
 * First-visit-only spotlight for "Adjuntar archivos", the first of the two
 * per-line actions of the emission editor.
 *
 * Both actions went unnoticed in the verifier review of the demo: the eye
 * travels to the continue button and skips the row of icons, so the two places
 * where a declaration's backing evidence and the source of an own factor are
 * meant to live stayed empty. Each button gets its own hint — they solve
 * different problems for the verifier, and one popover covering both left it
 * vague which icon did what.
 *
 * Waits for a visible line in the selected category, since the button only
 * exists on a line, and for the expert-mode hint to be out of the way. The
 * extra-info hint then queues behind this one's `isPending`, so the two arrive
 * in reading order instead of stacking.
 */
export const useLineAttachmentsOnboardingHighlight = (
  hasCapturedLines: boolean,
  isExpertModeHintPending: boolean
): OnboardingSpotlight =>
  useOnboardingSpotlight({
    key: OnboardingKeys.EMISSION_CAPTURE_LINE_ATTACHMENTS,
    targetId: "emission-capture-line-attachments",
    title: "Adjunta el respaldo de la fuente",
    description:
      "Con este botón subes los archivos que respaldan la fuente: la boleta, la factura o la planilla de donde sacaste la cantidad. Quien verifique tu huella los va a revisar, así que conviene cargarlos a medida que ingresas cada fuente.",
    isBlocked: !hasCapturedLines || isExpertModeHintPending,
  });
