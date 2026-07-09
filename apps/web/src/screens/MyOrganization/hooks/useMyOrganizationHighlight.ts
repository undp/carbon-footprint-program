import { useEffect } from "react";
import { consumeOnboardingFocus } from "@/utils/onboardingSignals";
import {
  runOnboardingHighlight,
  findOnboardingTarget,
} from "@/utils/onboardingHighlight";

/**
 * Spotlights the control the user came here to click from the home onboarding:
 * the create button for the create-org step, or the inscription request button
 * for the inscribe step. Targets are resolved by their stable
 * `data-onboarding-id` attribute, so per-deployment wording keeps matching.
 * No-ops when no matching onboarding focus is pending or the target button
 * isn't available in the current state — a focus for another screen is left
 * untouched so it can resolve where it belongs.
 */
export const useMyOrganizationHighlight = () => {
  useEffect(() => {
    const focus = consumeOnboardingFocus(["create-org", "solicit-inscription"]);

    if (focus === "create-org") {
      return runOnboardingHighlight({
        find: findOnboardingTarget("create-org"),
        title: "Crea tu organización",
        description:
          "Haz clic para registrar tu organización y comenzar a medir.",
        debugLabel: "create-org",
      });
    }

    if (focus === "solicit-inscription") {
      return runOnboardingHighlight({
        find: findOnboardingTarget("solicit-inscription"),
        title: "Inscribe tu organización",
        description: "Haz clic aquí para postular tu organización.",
        debugLabel: "solicit-inscription",
      });
    }

    return undefined;
  }, []);
};
