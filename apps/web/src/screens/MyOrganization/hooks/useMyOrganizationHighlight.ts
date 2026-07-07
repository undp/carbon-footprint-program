import { useEffect } from "react";
import { consumeOnboardingFocus } from "@/utils/onboardingSignals";
import {
  runOnboardingHighlight,
  findButtonByText,
} from "@/utils/onboardingHighlight";

/**
 * Spotlights the control the user came here to click from the home onboarding:
 * "Crear Organización" for the create-org step, or "Solicitar Inscripción" for
 * the inscribe step. No-ops when no matching onboarding focus is pending or the
 * target button isn't available in the current state.
 */
export const useMyOrganizationHighlight = () => {
  useEffect(() => {
    const focus = consumeOnboardingFocus();

    if (focus === "create-org") {
      return runOnboardingHighlight({
        find: findButtonByText("Crear Organización"),
        title: "Crea tu organización",
        description:
          "Haz clic para registrar tu organización y comenzar a medir.",
      });
    }

    if (focus === "solicit-inscription") {
      return runOnboardingHighlight({
        find: findButtonByText("Solicitar Inscripción"),
        title: "Inscribe tu organización",
        description:
          "Haz clic en “Solicitar Inscripción” para postular tu organización.",
      });
    }

    return undefined;
  }, []);
};
