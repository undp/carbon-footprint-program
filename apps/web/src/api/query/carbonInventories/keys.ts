import type { QueryClient, QueryKey } from "@tanstack/react-query";

export const carbonInventoryKeys = {
  all: ["carbonInventories", "organizationStatusDependency"] as const,
  detail: (id: string) => ["carbonInventories", id] as const,
  methodology: (id: string) =>
    ["carbonInventories", id, "methodology"] as const,
  emissionsSummaryCategories: (id: string) =>
    ["carbonInventories", id, "emissions-summary-categories"] as const,
  subcategoriesRanking: (id: string) =>
    ["carbonInventories", id, "subcategories-ranking"] as const,
  sectorRanking: (id: string) =>
    ["carbonInventories", id, "sector-ranking"] as const,
  mainActivityEquivalence: (id: string) =>
    ["carbonInventories", id, "main-activity-equivalence"] as const,
  suggestedReductionPlan: (id: string) =>
    ["carbonInventories", id, "suggested-reduction-plan"] as const,
  emissionsDetailedSummary: (id: string) =>
    ["carbonInventories", id, "emissions-detailed-summary"] as const,
  emissionFactors: (id: string) =>
    ["carbonInventories", id, "emission-factors"] as const,
  metadata: (id: string) => ["carbonInventories", id, "metadata"] as const,
  availableYears: ["carbonInventories", "availableYears"] as const,
  badges: (id?: string) => ["carbonInventories", id, "badges"] as const,
};

export const invalidateCarbonInventoryMetadata = (
  queryClient: QueryClient,
  inventoryId: string
) => {
  const keys: QueryKey[] = [
    carbonInventoryKeys.mainActivityEquivalence(inventoryId),
    carbonInventoryKeys.suggestedReductionPlan(inventoryId),
    carbonInventoryKeys.metadata(inventoryId),
  ];
  return Promise.all(
    keys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey, exact: true })
    )
  );
};

export const invalidateCarbonInventoryEmissions = (
  queryClient: QueryClient,
  inventoryId: string
) => {
  const keys: QueryKey[] = [
    carbonInventoryKeys.detail(inventoryId),
    carbonInventoryKeys.emissionsDetailedSummary(inventoryId),
    carbonInventoryKeys.emissionFactors(inventoryId),
    carbonInventoryKeys.emissionsSummaryCategories(inventoryId),
    carbonInventoryKeys.subcategoriesRanking(inventoryId),
    carbonInventoryKeys.sectorRanking(inventoryId),
    carbonInventoryKeys.all,
  ];
  return Promise.all([
    invalidateCarbonInventoryMetadata(queryClient, inventoryId),
    ...keys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey, exact: true })
    ),
  ]);
};
