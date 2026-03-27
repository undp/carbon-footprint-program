import { FC, useMemo, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { Download } from "@mui/icons-material";
import { orderBy, uniq } from "lodash-es";
import { useCarbonInventoriesMinimalData, useReductionPlan } from "@/api/query";
import { exportReductionPlanToExcel } from "@/utils/exportReductionPlanToExcel";
import { ExplanationProvider } from "@/contexts/ExplanationContext";
import { CategoryCard } from "@/screens/CarbonInventory/components/CategoryCard";
import { ReductionPlanHeader } from "./components/ReductionPlanHeader";
import { SubcategoryInitiativeGroup } from "./components/SubcategoryInitiativeGroup";

export const ReductionPlanScreen: FC = () => {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedCarbonInventoryId, setSelectedCarbonInventoryId] = useState<
    string | null
  >(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  const { data: inventories = [], isLoading: isLoadingInventories } =
    useCarbonInventoriesMinimalData();

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

  const { data: reductionPlan, isLoading: isLoadingPlan } =
    useReductionPlan(effectiveInventoryId);

  // Derive effective category: use selected if valid, otherwise first available
  const effectiveCategoryId = useMemo(() => {
    const categories = reductionPlan?.categories ?? [];
    if (categories.length === 0) return null;
    if (
      selectedCategoryId &&
      categories.some((c) => c.id === selectedCategoryId)
    ) {
      return selectedCategoryId;
    }
    return categories[0].id;
  }, [reductionPlan?.categories, selectedCategoryId]);

  const effectiveCategory = useMemo(
    () => reductionPlan?.categories.find((c) => c.id === effectiveCategoryId),
    [reductionPlan?.categories, effectiveCategoryId]
  );

  if (isLoadingInventories) {
    return (
      <Box className="flex flex-1 items-center justify-center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ExplanationProvider>
      <Box className="flex flex-1 flex-col gap-6">
        <ReductionPlanHeader
          availableYears={availableYears}
          inventories={inventoriesForSelectedYear}
          selectedYear={effectiveYear}
          selectedCarbonInventory={effectiveInventoryId}
          onYearChange={setSelectedYear}
          onCarbonInventoryChange={setSelectedCarbonInventoryId}
        />

        <Box className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-lg bg-white p-4">
          {/* Title row */}
          <Box className="flex items-center justify-between">
            <Typography variant="h6" color="#414046">
              Plan de reducción por categoría
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Download />}
              disabled={!reductionPlan}
              onClick={() => {
                if (reductionPlan) {
                  exportReductionPlanToExcel(reductionPlan);
                }
              }}
            >
              Descargar
            </Button>
          </Box>

          {isLoadingPlan && (
            <Box className="flex flex-1 items-center justify-center py-8">
              <CircularProgress />
            </Box>
          )}

          {!isLoadingPlan && reductionPlan && (
            <>
              {/* Category cards */}
              {reductionPlan.categories.length > 0 && (
                <Box className="flex gap-4">
                  {reductionPlan.categories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      icon={category.icon}
                      categoryColor={category.color}
                      title={category.name}
                      subtitle={category.synonyms}
                      description={category.description}
                      explanationId={category.explanationId}
                      variant={
                        effectiveCategoryId === category.id
                          ? "focused"
                          : "unfocused"
                      }
                      onClick={() => setSelectedCategoryId(category.id)}
                    />
                  ))}
                </Box>
              )}

              {/* Subcategory groups with initiatives */}
              {effectiveCategory &&
              effectiveCategory.subcategories.length > 0 ? (
                <Box className="flex flex-col gap-6">
                  {effectiveCategory.subcategories.map((subcategory) => (
                    <SubcategoryInitiativeGroup
                      key={subcategory.id}
                      name={subcategory.name}
                      icon={subcategory.icon}
                      description={subcategory.description}
                      initiatives={subcategory.initiatives}
                      categoryColor={effectiveCategory.color}
                    />
                  ))}
                </Box>
              ) : (
                <Box className="flex flex-1 items-center justify-center py-8">
                  <Typography color="textSecondary">
                    No hay iniciativas de reducción disponibles para esta
                    huella.
                  </Typography>
                </Box>
              )}
            </>
          )}

          {!isLoadingPlan && !reductionPlan && effectiveInventoryId && (
            <Box className="flex flex-1 items-center justify-center py-8">
              <Typography color="textSecondary">
                No se pudo cargar el plan de reducción.
              </Typography>
            </Box>
          )}

          {!effectiveInventoryId && (
            <Box className="flex flex-1 items-center justify-center py-8">
              <Typography color="textSecondary">
                Selecciona una huella para ver el plan de reducción.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </ExplanationProvider>
  );
};
