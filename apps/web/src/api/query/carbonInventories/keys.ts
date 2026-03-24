export const carbonInventoryKeys = {
  all: [
    "carbonInventories",
    "carbonInventoriesListDependency",
    "carbonInventoryAttributesUpdateDependency",
    "carbonInventoryEmissionsUpdateDependency",
    "organizationStatusDependency",
  ] as const,
  detail: (id: string) =>
    [
      "carbonInventories",
      id,
      "carbonInventoryAttributesUpdateDependency",
      "carbonInventoryEmissionsUpdateDependency",
    ] as const,
  methodology: (id: string) =>
    ["carbonInventories", id, "methodology"] as const,
  subcategoriesSummary: (id: string) =>
    [
      "carbonInventorySubcategories",
      id,
      "carbonInventoryEmissionsUpdateDependency",
    ] as const,
  emissionsSummaryCategories: (id: string) =>
    [
      "carbonInventories",
      id,
      "emissions-summary-categories",
      "carbonInventoryAttributesUpdateDependency",
      "carbonInventoryEmissionsUpdateDependency",
    ] as const,
  subcategoriesRanking: (id: string) =>
    [
      "carbonInventories",
      id,
      "subcategories-ranking",
      "carbonInventoryEmissionsUpdateDependency",
    ] as const,
  sectorRanking: (id: string) =>
    [
      "carbonInventories",
      id,
      "sector-ranking",
      "carbonInventoryEmissionsUpdateDependency",
    ] as const,
  mainActivityEquivalence: (id: string) =>
    [
      "carbonInventories",
      id,
      "main-activity-equivalence",
      "carbonInventoryAttributesUpdateDependency",
      "carbonInventoryEmissionsUpdateDependency",
    ] as const,
  suggestedReductionPlan: (id: string) =>
    [
      "carbonInventories",
      id,
      "suggested-reduction-plan",
      "carbonInventoryEmissionsUpdateDependency",
    ] as const,
  emissionsDetailedSummary: (id: string) =>
    [
      "carbonInventories",
      id,
      "emissions-detailed-summary",
      "carbonInventoryAttributesUpdateDependency",
      "carbonInventoryEmissionsUpdateDependency",
    ] as const,
  emissionFactors: (id: string) =>
    [
      "carbonInventories",
      id,
      "emission-factors",
      "carbonInventoryEmissionsUpdateDependency",
    ] as const,
  metadata: (id: string) =>
    [
      "carbonInventories",
      id,
      "metadata",
      "carbonInventoryAttributesUpdateDependency",
    ] as const,
  minimal: [
    "carbonInventories",
    "minimal",
    "carbonInventoriesListDependency",
    "carbonInventoryAttributesUpdateDependency",
  ] as const,
  badges: (id?: string) => ["carbonInventories", id, "badges"] as const,
};
