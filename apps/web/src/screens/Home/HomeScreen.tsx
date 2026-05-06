import { FC, useCallback, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { useCarbonInventoriesMinimalData } from "@/api/query";
import { Header } from "./components";
import { capitalize, orderBy, uniq } from "lodash-es";
import { EmissionResultsContent, ScreenEmptyState } from "@/components";
import { UnverifiedCarbonInventoriesContent } from "./components/UnverifiedCarbonInventoriesContent";
import { HomeScreenSkeleton } from "./components/Skeletons/HomeScreenSkeleton";
import { CarbonInventoryDisplayStatusEnum } from "@repo/types";
import { useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { VOCAB } from "@/config/vocab";

export const HomeScreen: FC = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedCarbonInventoryId, setSelectedCarbonInventoryId] = useState<
    string | null
  >(null);

  const { data: inventories = [], isLoading: isLoadingInventories } =
    useCarbonInventoriesMinimalData([
      CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED,
      CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED,
    ]);

  const availableYears = useMemo(() => {
    const years = inventories
      .filter((inv) => inv.year !== null && inv.year !== undefined)
      .map((inv) => inv.year!.toString());
    return orderBy(uniq(years), Number, "desc");
  }, [inventories]);

  const effectiveYear =
    selectedYear && availableYears.includes(selectedYear)
      ? selectedYear
      : (availableYears[0] ?? "");

  const inventoriesForSelectedYear = useMemo(() => {
    if (!effectiveYear) return [];
    return inventories.filter((inv) => inv.year?.toString() === effectiveYear);
  }, [inventories, effectiveYear]);

  const effectiveInventoryId =
    selectedCarbonInventoryId &&
    inventoriesForSelectedYear.some(
      (inv) => inv.id === selectedCarbonInventoryId
    )
      ? selectedCarbonInventoryId
      : (inventoriesForSelectedYear[0]?.id ?? "");

  const onNavigateToInventories = useCallback(() => {
    void navigate({ to: Routes.CARBON_INVENTORIES });
  }, [navigate]);

  if (isLoadingInventories) {
    return <HomeScreenSkeleton />;
  }

  if (!effectiveInventoryId) {
    return (
      <ScreenEmptyState
        title="No tienes huellas con reconocimiento de verificación"
        description="Postula al reconocimiento de verificación alguna de tus huellas"
        action={{
          label: `Ir a Huella ${capitalize(VOCAB.organization.relationalAdjective)}`,
          onClick: onNavigateToInventories,
        }}
      />
    );
  }

  return (
    <Box className="flex flex-1 flex-col gap-6">
      <Header
        availableYears={availableYears}
        inventories={inventoriesForSelectedYear}
        onYearChange={setSelectedYear}
        onCarbonInventoryChange={setSelectedCarbonInventoryId}
        selectedYear={effectiveYear}
        selectedCarbonInventory={effectiveInventoryId}
      />

      <Box className="flex min-h-0 flex-1 flex-col gap-4 rounded-lg bg-white p-6">
        {effectiveInventoryId && (
          <EmissionResultsContent
            inventoryId={effectiveInventoryId}
            showBadges
          />
        )}
        {!effectiveInventoryId && <UnverifiedCarbonInventoriesContent />}
      </Box>
    </Box>
  );
};
