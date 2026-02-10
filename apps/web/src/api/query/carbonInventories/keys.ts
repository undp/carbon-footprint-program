export const carbonInventoryKeys = {
  all: ["carbonInventories"] as const,
  detail: (id: string) => ["carbonInventories", id] as const,
  methodology: (id: string) =>
    ["carbonInventories", id, "methodology"] as const,
  results: (id: string) => ["carbonInventories", id, "results"] as const,
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
  availableYears: ["carbonInventories", "availableYears"] as const,
};
