import { FC } from "react";
import { Box } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { CarbonInventoryLayout, type FooterButton } from "./layout";
import { StepHeader, CarbonInventoryNavigationButton } from "./components";
import { Routes } from "@/interfaces";
import { useEmissionResultsNavigation } from "./hooks/useEmissionResultsNavigation";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { useAuth } from "../../contexts";
import { EmissionResultsContent } from "@/components";
import { useEmissionsSummaryCategories } from "@/api/query";
import { CarbonInventoryStatusChip } from "../../components/CarbonInventoryStatusChip";
import { isCarbonInventoryEditable } from "@repo/utils";
import { useCommonNavigation } from "./hooks/useCommonNavigation";

export const EmissionResultsScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_RESULTS,
  });

  const { user } = useAuth();
  const { goBack } = useEmissionResultsNavigation(inventoryId);
  const { goToList, goToLanding } = useCommonNavigation();

  const { data: summaryData } = useEmissionsSummaryCategories(inventoryId);

  const backButton: FooterButton = {
    text: "Volver",
    align: "right",
    buttonProps: {
      startIcon: <ArrowRightAltRounded className="-scale-x-100" />,
      onClick: goBack,
    },
  };

  const isEditable =
    summaryData?.carbonInventory.status &&
    isCarbonInventoryEditable(summaryData.carbonInventory.status);

  const nextButton: FooterButton = user
    ? {
        text: "Guardar Borrador",
        align: "right",
        buttonProps: { variant: "contained", onClick: goToList },
      }
    : {
        text: "Volver a empezar",
        align: "right",
        buttonProps: { variant: "contained", onClick: goToLanding },
      };

  return (
    <CarbonInventoryLayout
      headerProps={{
        title: "Simulador de Inventario Organizacional",
        subtitle: summaryData?.carbonInventory.name ?? undefined,
        action: isEditable ? undefined : (
          <CarbonInventoryNavigationButton
            type={user ? "inventories" : "landing"}
            buttonProps={{ onClick: goToList }}
          />
        ),
      }}
      footerProps={{
        buttons: isEditable ? [backButton, nextButton] : [backButton],
      }}
    >
      <Box className="flex min-h-0 flex-1 flex-col gap-4 rounded-lg bg-white p-6">
        <Box className="flex items-center justify-between">
          <StepHeader
            title="Paso 5: Resultados"
            description="Conoce el total de tu huella de carbono y toma acción con el plan de reducción sugerido."
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
    </CarbonInventoryLayout>
  );
};
