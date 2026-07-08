import { useEffect } from "react";
import { consumeOnboardingFocus } from "@/utils/onboardingSignals";
import {
  runOnboardingHighlight,
  findButtonByText,
} from "@/utils/onboardingHighlight";
import { VOCAB } from "@/config/vocab";

/**
 * Spotlights the control the user came here to click from the home onboarding:
 * the create button for the create-org step, or the inscription request button
 * for the inscribe step. The needles derive from VOCAB, like the on-screen
 * labels, so per-deployment wording keeps matching. No-ops when no matching
 * onboarding focus is pending or the target button isn't available in the
 * current state.
 */
export const useMyOrganizationHighlight = () => {
  useEffect(() => {
    const focus = consumeOnboardingFocus();

    if (focus === "create-org") {
      return runOnboardingHighlight({
        find: findButtonByText(`Crear ${VOCAB.organization.noun.singular}`),
        title: "Crea tu organización",
        description:
          "Haz clic para registrar tu organización y comenzar a medir.",
      });
    }

    if (focus === "solicit-inscription") {
      return runOnboardingHighlight({
        find: findButtonByText(`Solicitar ${VOCAB.inscription.noun.singular}`),
        title: "Inscribe tu organización",
        description: "Haz clic aquí para postular tu organización.",
      });
    }

    return undefined;
  }, []);
};
