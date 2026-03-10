import { FC } from "react";
import { Box } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { CarbonInventoryLayout, type FooterButton } from "./layout";
import { StepHeader } from "./components/StepHeader";
import { Routes } from "@/interfaces";
import { useEmissionResultsNavigation } from "./hooks/useEmissionResultsNavigation";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { useAuth } from "../../contexts";
import { EmissionResultsContent } from "@/components";
import { useEmissionsSummaryCategories } from "@/api/query";

export const EmissionResultsScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_RESULTS,
  });

  const { user } = useAuth();

  const { goBack, goToList, goToLanding } =
    useEmissionResultsNavigation(inventoryId);

  const { data: summaryData } = useEmissionsSummaryCategories(inventoryId);

  const backButton: FooterButton = {
    text: "Volver",
    align: "right",
    buttonProps: {
      startIcon: <ArrowRightAltRounded className="-scale-x-100" />,
      onClick: goBack,
    },
  };

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
      }}
      footerProps={{
        buttons: [backButton, nextButton],
      }}
    >
      <Box className="flex min-h-0 flex-1 flex-col gap-4 rounded-lg bg-white p-6">
        <StepHeader
          title="Paso 5: Resultados"
          description="Conoce el total de tu huella de carbono y toma acción con el plan de reducción sugerido."
        />
        <EmissionResultsContent inventoryId={inventoryId} />
      </Box>
    </CarbonInventoryLayout>
  );
};
