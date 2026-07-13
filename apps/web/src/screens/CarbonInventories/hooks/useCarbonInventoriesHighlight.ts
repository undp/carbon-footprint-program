import { useEffect } from "react";
import {
  CarbonInventoriesTab,
  useCarbonInventoriesStore,
} from "./useCarbonInventoriesStore";
import { consumeOnboardingFocus } from "@/utils/onboardingSignals";
import {
  runOnboardingHighlight,
  findOnboardingTarget,
} from "@/utils/onboardingHighlight";

/**
 * Spotlights the control the user came here to click from the home onboarding:
 * "Nueva Huella" for the create-huella step, the organization button of a draft
 * for the associate-org step, or the Autodeclarar button of the most-recent
 * draft for the self-declare step (switching to the Borradores tab first for the
 * draft-scoped ones). Targets are resolved by their stable `data-onboarding-id`
 * attribute. No-ops when no matching onboarding focus is pending — a focus for
 * another screen is left untouched so it can resolve where it belongs.
 */
export const useCarbonInventoriesHighlight = () => {
  const setActiveTab = useCarbonInventoriesStore((state) => state.setActiveTab);

  useEffect(() => {
    const focus = consumeOnboardingFocus([
      "new-huella",
      "associate-org",
      "self-declare",
    ]);

    if (focus === "new-huella") {
      return runOnboardingHighlight({
        find: findOnboardingTarget("new-huella"),
        title: "Crea tu huella",
        description:
          "Haz clic en “Nueva Huella” para calcular o subir tus emisiones.",
        debugLabel: "new-huella",
      });
    }

    if (focus === "associate-org") {
      setActiveTab(CarbonInventoriesTab.DRAFTS);
      return runOnboardingHighlight({
        find: findOnboardingTarget("associate-org"),
        title: "Asocia tu huella a la organización",
        description:
          "Haz clic aquí para asociar esta huella a tu organización y poder autodeclararla.",
        debugLabel: "associate-org",
      });
    }

    if (focus === "self-declare") {
      setActiveTab(CarbonInventoriesTab.DRAFTS);
      return runOnboardingHighlight({
        find: findOnboardingTarget("self-declare"),
        title: "Autodeclara tu huella",
        description:
          "Haz clic aquí para autodeclarar tu huella y publicarla en tu inicio.",
        debugLabel: "self-declare",
      });
    }

    return undefined;
  }, [setActiveTab]);
};
