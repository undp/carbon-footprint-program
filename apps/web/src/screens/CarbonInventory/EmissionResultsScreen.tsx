import { FC, useState } from "react";
import { Box } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { CarbonInventoryLayout, type FooterButton } from "./layout";
import {
  StepHeader,
  CarbonInventoryNavigationButton,
  SaveDraftAuthModal,
} from "./components";
import { Routes } from "@/interfaces";
import { useEmissionResultsNavigation } from "./hooks/useEmissionResultsNavigation";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { useAuth } from "../../contexts";
import { EmissionResultsContent } from "@/components";
import { useEmissionsSummaryCategories } from "@/api/query";
import { CarbonInventoryStatusChip } from "../../components/CarbonInventoryStatusChip";
import { useCommonNavigation } from "./hooks/useCommonNavigation";
import { useInventoryErrorHandler } from "./hooks/useInventoryErrorHandler";
import capitalize from "lodash-es/capitalize";
import { VOCAB } from "../../config/vocab";
import { useCarbonInventoryAccess } from "@/hooks";

const EMISSION_RESULTS_EXPLANATION_SLUGS = {
  MAIN: "emission-results",
} as const;

export const EmissionResultsScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_RESULTS,
  });

  const { user } = useAuth();
  const { goBack } = useEmissionResultsNavigation(inventoryId);
  const { goToList } = useCommonNavigation();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const { data: summaryData, error: summaryError } =
    useEmissionsSummaryCategories(inventoryId);

  useInventoryErrorHandler(summaryError);

  const backButton: FooterButton = {
    text: "Volver",
    align: "right",
    buttonProps: {
      startIcon: <ArrowRightAltRounded className="-scale-x-100" />,
      onClick: goBack,
    },
  };

  const { canEdit, hasMembership, isReady } =
    useCarbonInventoryAccess(inventoryId);
  const isEditable = summaryData?.carbonInventory.status ? canEdit : false;
  // Admin viewing an inventory they don't belong to: hide the user-facing
  // navigation since admins reach this screen through the admin tools.
  const hideOwnerNavigation = !isEditable && !hasMembership;

  const nextButton: FooterButton = user
    ? {
        text: "Guardar Borrador",
        align: "right",
        buttonProps: { variant: "contained", onClick: goToList },
      }
    : {
        text: "Guardar Borrador",
        align: "right",
        buttonProps: {
          variant: "contained",
          onClick: () => setAuthModalOpen(true),
        },
      };

  const showHeaderNavigation = !isEditable && !hideOwnerNavigation;
  const footerButtons: FooterButton[] = isEditable
    ? [backButton, nextButton]
    : [backButton];

  return (
    <CarbonInventoryLayout
      headerProps={{
        title: `Simulador de Huella ${capitalize(VOCAB.organization.relationalAdjective)}`,
        subtitle: summaryData?.carbonInventory.name ?? undefined,
        action: showHeaderNavigation ? (
          // If the inventory is locked (non-editable), we assume a registered user session.
          // Otherwise, we default to the guest flow, where the footer button handles
          // registration or temporary data persistence.
          <CarbonInventoryNavigationButton
            type="inventories"
            buttonProps={{ onClick: goToList, disabled: !isReady }}
          />
        ) : undefined,
      }}
      footerProps={{
        buttons: footerButtons,
      }}
    >
      <Box className="flex min-h-0 flex-1 flex-col gap-4 rounded-lg bg-white p-6">
        <Box className="flex items-center justify-between">
          <StepHeader
            title="Paso 5: Resultados"
            description="Conoce el total de tu huella de carbono y toma acción con el plan de reducción sugerido."
            explanationSlug={EMISSION_RESULTS_EXPLANATION_SLUGS.MAIN}
          />
          {summaryData?.carbonInventory.status && (
            <CarbonInventoryStatusChip
              status={summaryData.carbonInventory.status}
              size="medium"
            />
          )}
        </Box>
        <EmissionResultsContent inventoryId={inventoryId} />
      </Box>
      <SaveDraftAuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        inventoryId={inventoryId}
      />
    </CarbonInventoryLayout>
  );
};
