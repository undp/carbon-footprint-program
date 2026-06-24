import { MaintainerQueryKey } from "../maintainer/keys";
import { CountrySectorQueryKey } from "../countrySectors/keys";
import { CountrySubsectorQueryKey } from "../countrySubsectors/keys";

export enum CarbonInventoryQueryKey {
  Root = "carbonInventories",
  Subcategories = "carbonInventorySubcategories",
  ListDependency = "carbonInventoriesListDependency",
  OrganizationStatusDependency = "organizationStatusDependency",
  AttributesUpdateDependency = "carbonInventoryAttributesUpdateDependency",
  EmissionsUpdateDependency = "carbonInventoryEmissionsUpdateDependency",
  StatusUpdateDependency = "carbonInventoryStatusUpdateDependency",
  Methodology = "methodology",
  EmissionsSummaryCategories = "emissions-summary-categories",
  SubcategoriesRanking = "subcategories-ranking",
  SectorRanking = "sector-ranking",
  MainActivityEquivalence = "main-activity-equivalence",
  SuggestedReductionPlan = "suggested-reduction-plan",
  EmissionsDetailedSummary = "emissions-detailed-summary",
  EmissionFactors = "emission-factors",
  Metadata = "metadata",
  Access = "access",
  Minimal = "minimal",
  Badges = "badges",
  SubcategoryRecommendations = "subcategory-recommendations",
  ReductionPlan = "reduction-plan",
}

export const carbonInventoryKeys = {
  all: [
    CarbonInventoryQueryKey.Root,
    CarbonInventoryQueryKey.ListDependency,
    CarbonInventoryQueryKey.OrganizationStatusDependency,
  ] as const,
  detail: (id: string) =>
    [
      CarbonInventoryQueryKey.Root,
      id,
      CarbonInventoryQueryKey.AttributesUpdateDependency,
      CarbonInventoryQueryKey.EmissionsUpdateDependency,
    ] as const,
  methodology: (id: string) =>
    [
      CarbonInventoryQueryKey.Root,
      id,
      CarbonInventoryQueryKey.Methodology,
    ] as const,
  subcategoriesSummary: (id: string) =>
    [
      CarbonInventoryQueryKey.Subcategories,
      id,
      CarbonInventoryQueryKey.EmissionsUpdateDependency,
    ] as const,
  emissionsSummaryCategories: (id: string) =>
    [
      CarbonInventoryQueryKey.Root,
      id,
      CarbonInventoryQueryKey.EmissionsSummaryCategories,
      CarbonInventoryQueryKey.AttributesUpdateDependency,
      CarbonInventoryQueryKey.EmissionsUpdateDependency,
    ] as const,
  subcategoriesRanking: (id: string) =>
    [
      CarbonInventoryQueryKey.Root,
      id,
      CarbonInventoryQueryKey.SubcategoriesRanking,
      CarbonInventoryQueryKey.EmissionsUpdateDependency,
    ] as const,
  sectorRanking: (id: string) =>
    [
      CarbonInventoryQueryKey.Root,
      id,
      CarbonInventoryQueryKey.SectorRanking,
      CarbonInventoryQueryKey.AttributesUpdateDependency,
      CarbonInventoryQueryKey.EmissionsUpdateDependency,
    ] as const,
  mainActivityEquivalence: (id: string) =>
    [
      CarbonInventoryQueryKey.Root,
      id,
      CarbonInventoryQueryKey.MainActivityEquivalence,
      CarbonInventoryQueryKey.AttributesUpdateDependency,
      CarbonInventoryQueryKey.EmissionsUpdateDependency,
    ] as const,
  suggestedReductionPlan: (id: string) =>
    [
      CarbonInventoryQueryKey.Root,
      id,
      CarbonInventoryQueryKey.SuggestedReductionPlan,
      CarbonInventoryQueryKey.AttributesUpdateDependency,
      CarbonInventoryQueryKey.EmissionsUpdateDependency,
    ] as const,
  emissionsDetailedSummary: (id: string) =>
    [
      CarbonInventoryQueryKey.Root,
      id,
      CarbonInventoryQueryKey.EmissionsDetailedSummary,
      CarbonInventoryQueryKey.AttributesUpdateDependency,
      CarbonInventoryQueryKey.EmissionsUpdateDependency,
    ] as const,
  emissionFactors: (id: string) =>
    [
      CarbonInventoryQueryKey.Root,
      id,
      CarbonInventoryQueryKey.EmissionFactors,
      CarbonInventoryQueryKey.EmissionsUpdateDependency,
    ] as const,
  metadata: (id: string) =>
    [
      CarbonInventoryQueryKey.Root,
      id,
      CarbonInventoryQueryKey.Metadata,
      CarbonInventoryQueryKey.AttributesUpdateDependency,
    ] as const,
  access: (id: string) =>
    [
      CarbonInventoryQueryKey.Root,
      id,
      CarbonInventoryQueryKey.Access,
      CarbonInventoryQueryKey.StatusUpdateDependency,
    ] as const,
  minimal: [
    CarbonInventoryQueryKey.Root,
    CarbonInventoryQueryKey.Minimal,
    CarbonInventoryQueryKey.ListDependency,
  ] as const,
  badges: (id?: string) =>
    [CarbonInventoryQueryKey.Root, id, CarbonInventoryQueryKey.Badges] as const,
  subcategoryRecommendations: (id: string) =>
    [
      CarbonInventoryQueryKey.Root,
      id,
      // User-side dependency: the recommendations are scoped to the inventory's
      // org sector/subsector, so they shift when those attributes change.
      CarbonInventoryQueryKey.AttributesUpdateDependency,
      CarbonInventoryQueryKey.SubcategoryRecommendations,
      // Maintainer-side dependency tokens. The recommendation dataset also shifts
      // when an admin creates/updates a recommendation, or when a sector/subsector/
      // subcategory/category soft-delete cascades over it. Compose the same tokens
      // the maintainer grid uses (see subcategoryRecommendations/keys.ts) so those
      // admin mutations invalidate this query too — it has `staleTime: Infinity`,
      // so without the token it would never refetch within a session.
      MaintainerQueryKey.SubcategoryRecommendationsUpdateDependency,
      MaintainerQueryKey.SubcategoriesUpdateDependency,
      MaintainerQueryKey.CategoriesUpdateDependency,
      CountrySectorQueryKey.CatalogUpdateDependency,
      CountrySubsectorQueryKey.CatalogUpdateDependency,
    ] as const,
  reductionPlan: (inventoryId?: string) =>
    [
      CarbonInventoryQueryKey.Root,
      inventoryId,
      CarbonInventoryQueryKey.EmissionsUpdateDependency,
      CarbonInventoryQueryKey.ReductionPlan,
    ] as const,
};
