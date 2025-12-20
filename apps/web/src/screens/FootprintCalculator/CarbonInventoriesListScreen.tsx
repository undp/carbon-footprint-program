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
import { CarbonInventory } from "@repo/types";

export const CarbonInventoriesListScreen: FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: inventories = [], isLoading } = useCarbonInventories();
  const createInventoryMutation = useCreateCarbonInventory();

  const handleSelectInventory = (inventory: CarbonInventory) => {
    void navigate({
      to: Routes.CARBON_INVENTORY_BUSINESS_PROFILING as string,
      params: { inventoryId: inventory.id },
    });
  };

  const handleCreateNew = async () => {
    const currentYear = new Date().getFullYear();

    try {
      const createdInventory = await createInventoryMutation.mutateAsync({
        year: currentYear,
        usageMode: "SIMPLIFIED",
      });

      void navigate({
        to: Routes.CARBON_INVENTORY_BUSINESS_PROFILING as string,
        params: { inventoryId: createdInventory.id },
      });
    } catch (error) {
      console.error("Error creating carbon inventory:", error);
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

  return (
    <MainLayout>
      <Box className="flex flex-col flex-1 gap-6 p-6">
        <Box className="flex flex-col p-6 rounded-lg bg-white gap-6">
          <StepHeader
            title="Inventarios de Carbono"
            description="Selecciona un inventario existente para continuar o crea uno nuevo."
            action={
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateNew}
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
            <Box className="text-center py-8">
              <Typography variant="h6" color="text.secondary">
                No hay inventarios disponibles
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Crea tu primer inventario para comenzar
              </Typography>
            </Box>
          ) : (
            <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inventories.map((inventory) => (
                <Card
                  key={inventory.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSelectInventory(inventory)}
                >
                  <CardContent className="p-4">
                    <Box className="flex justify-between items-start mb-2">
                      <Typography variant="h6" component="div">
                        {String(
                          inventory.organizationData?.name || "Sin nombre"
                        )}
                      </Typography>
                      <Chip
                        label={inventory.status}
                        color={getStatusColor(inventory.status)}
                        size="small"
                      />
                    </Box>

                    <Box className="space-y-1">
                      <Typography variant="body2" color="text.secondary">
                        Año: {inventory.year}
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
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </MainLayout>
  );
};
