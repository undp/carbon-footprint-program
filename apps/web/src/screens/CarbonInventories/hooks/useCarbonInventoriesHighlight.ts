import { useEffect } from "react";
import {
  CarbonInventoriesTab,
  useCarbonInventoriesStore,
} from "./useCarbonInventoriesStore";
import { consumeOnboardingFocus } from "@/utils/onboardingSignals";
import {
  runOnboardingHighlight,
  findButtonByText,
  findBySelector,
} from "@/utils/onboardingHighlight";

// The Autodeclarar row action lives only in the Borradores tab; the grid is
// ordered createdAt-desc, so row 0 is the most-recent draft.
const AUTODECLARE_SELECTOR =
  '.MuiDataGrid-row[data-rowindex="0"] button[aria-label="Autodeclarar"]';

/**
 * Spotlights the control the user came here to click from the home onboarding:
 * "Nueva Huella" for the create-huella step, or the Autodeclarar button of the
 * most-recent draft for the self-declare step (switching to the Borradores tab
 * first). No-ops when no matching onboarding focus is pending.
 */
export const useCarbonInventoriesHighlight = () => {
  const setActiveTab = useCarbonInventoriesStore((state) => state.setActiveTab);

  useEffect(() => {
    const focus = consumeOnboardingFocus();

    if (focus === "new-huella") {
      return runOnboardingHighlight({
        find: findButtonByText("Nueva Huella"),
        title: "Crea tu huella",
        description:
          "Haz clic en “Nueva Huella” para calcular o subir tus emisiones.",
      });
    }

    if (focus === "self-declare") {
      setActiveTab(CarbonInventoriesTab.DRAFTS);
      return runOnboardingHighlight({
        find: findBySelector(AUTODECLARE_SELECTOR),
        title: "Autodeclara tu huella",
        description:
          "Haz clic aquí para autodeclarar tu huella y publicarla en tu inicio.",
      });
    }

    return undefined;
  }, [setActiveTab]);
};
