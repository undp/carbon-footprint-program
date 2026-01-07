import { FC } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
} from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces";
import { StepHeader } from "./components/StepHeader";
import { useCarbonInventories, useCreateCarbonInventory } from "@/api/query";
import { GetAllCarbonInventoriesResponse } from "@repo/types";

export const CarbonInventoriesListScreen: FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: inventories = [], isLoading } = useCarbonInventories();
  const createInventoryMutation = useCreateCarbonInventory();

  const handleSelectInventory = (
    inventory: GetAllCarbonInventoriesResponse[number]
  ) => {
    void navigate({
      to: Routes.CARBON_INVENTORY_BUSINESS_PROFILING,
      params: { inventoryId: inventory.id },
    });
  };

  const handleCreateNew = async () => {
    try {
      const createdInventory = await createInventoryMutation.mutateAsync({
        usageMode: "SIMPLIFIED",
      });

      void navigate({
        to: Routes.CARBON_INVENTORY_BUSINESS_PROFILING,
        params: { inventoryId: createdInventory.id },
      });
    } catch {
      enqueueSnackbar("No se pudo crear el inventario", { variant: "error" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "warning";
      case "SUBMITTED":
        return "info";
      case "VERIFIED":
        return "success";
      case "DELETED":
        return "error";
      default:
        return "default";
    }
  };

  const getUsageModeLabel = (mode: string) => {
    return mode === "SIMPLIFIED" ? "Simplificado" : "Experto";
  };

  const getYearLabel = (year: number | null | undefined) =>
    year ?? "Sin definir";

  return (
    <MainLayout>
      <Box className="flex flex-1 flex-col gap-6 p-6">
        <Box className="flex flex-col gap-6 rounded-lg bg-white p-6">
          <StepHeader
            title="Inventarios de Carbono"
            description="Selecciona un inventario existente para continuar o crea uno nuevo."
            action={
              <Button
                variant="contained"
                color="primary"
                onClick={() => void handleCreateNew()}
                disabled={createInventoryMutation.isPending}
              >
                {createInventoryMutation.isPending
                  ? "Creando..."
                  : "Crear Nuevo Inventario"}
              </Button>
            }
          />

          {isLoading ? (
            <Typography>Cargando inventarios...</Typography>
          ) : inventories.length === 0 ? (
            <Box className="py-8 text-center">
              <Typography variant="h6" color="text.secondary">
                No hay inventarios disponibles
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Crea tu primer inventario para comenzar
              </Typography>
            </Box>
          ) : (
            <Box className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {inventories.map((inventory) => {
                const organizationName =
                  typeof inventory.organizationData?.name === "string"
                    ? inventory.organizationData.name
                    : "Sin nombre";

                return (
                  <Card
                    key={inventory.id}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => handleSelectInventory(inventory)}
                  >
                    <CardContent className="p-4">
                      <Box className="mb-2 flex items-start justify-between">
                        <Typography variant="h6" component="div">
                          {organizationName}
                        </Typography>
                        <Chip
                          label={inventory.status}
                          color={getStatusColor(inventory.status)}
                          size="small"
                        />
                      </Box>

                      <Box className="space-y-1">
                        <Typography variant="body2" color="text.secondary">
                          Año: {getYearLabel(inventory.year)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Modo: {getUsageModeLabel(inventory.usageMode)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Creado:{" "}
                          {new Date(inventory.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </MainLayout>
  );
};
