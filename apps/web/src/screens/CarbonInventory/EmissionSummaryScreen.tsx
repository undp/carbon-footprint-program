import { FC } from "react";
import { useParams } from "@tanstack/react-router";
import { CarbonInventoryLayout } from "./layout";
import { Routes } from "@/interfaces";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { UnderConstructionScreen } from "../UnderConstruction";
import { Box } from "@mui/material";
import { StepHeader } from "./components";
import { useEmissionSummaryNavigation } from "./hooks/useEmissionSummaryNavigation";

export const EmissionSummaryScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_SUMMARY,
  });

  const { goBack, goNext } = useEmissionSummaryNavigation(inventoryId);

  return (
    <CarbonInventoryLayout
      headerProps={{
        title: "Simulador de Inventario Organizacional",
      }}
      footerProps={{
        buttons: [
          {
            text: "Volver",
            align: "right",
            buttonProps: {
              startIcon: <ArrowRightAltRounded className="-scale-x-100" />,
              onClick: goBack,
            },
          },
          {
            text: "Siguiente",
            align: "right",
            buttonProps: {
              endIcon: <ArrowRightAltRounded />,
              variant: "contained",
              onClick: goNext,
            },
          },
        ],
      }}
    >
      <Box className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-scroll rounded-lg bg-white p-6">
        {/* Header Section */}
        <Box className="flex items-center justify-between">
          <StepHeader
            title="Paso 4: Resumen Inventario Organizacional 2024"
            description="Verifica tus datos antes de calcular"
          />
        </Box>
        <UnderConstructionScreen />
      </Box>
    </CarbonInventoryLayout>
  );
};
