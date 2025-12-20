import { FC } from "react";
import { Box, Button } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { FootprintCalculatorLayout } from "./layout";
import { Routes } from "@/interfaces";
import { StepHeader } from "./components/StepHeader";

export const SubCategoryPreselectionScreen: FC = () => {
  const navigate = useNavigate();

  return (
    <FootprintCalculatorLayout
      headerProps={{
        title: "Simulador de Inventario Organizacional",
      }}
      footerProps={{
        backButtonProps: {
          onClick: () =>
            void navigate({
              to: Routes.CARBON_INVENTORY_BUSINESS_PROFILING as string,
            }),
        },
      }}
    >
      <Box className="flex flex-col flex-1 gap-6 p-6">
        <Box className="flex flex-col p-6 rounded-lg bg-white gap-6">
          <StepHeader
            title="Paso 2: Preselección de subcategorías"
            description="Estas son las principales fuentes de emisión que te recomendamos medir según tu rubro. Marca y/o desmarca las que aplican a tu empresa."
            action={
              <Button variant="outlined" color="primary">
                Agregar Nueva Fuente
              </Button>
            }
          />
          <Box className="flex flex-row gap-6">
            <Box className="flex-1 flex flex-col gap-8">
              {/* Agregar campos del formulario aquí */}
            </Box>
            <Box className="flex-1 flex flex-col gap-8">
              {/* Agregar campos del formulario aquí */}
            </Box>
          </Box>
        </Box>
      </Box>
    </FootprintCalculatorLayout>
  );
};
