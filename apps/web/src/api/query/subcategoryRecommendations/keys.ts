import { MaintainerQueryKey } from "../maintainer/keys";
import { CountrySectorQueryKey } from "../countrySectors/keys";
import { CountrySubsectorQueryKey } from "../countrySubsectors/keys";

/**
 * Subcategory-recommendation query keys, part of the maintainer dependency-token
 * system (see `maintainer/keys.ts`). The list composes the `*UpdateDependency`
 * tokens of every entity it depends on, so mutations invalidate it by token —
 * never by hand:
 * - its own token (create/update/delete a recommendation)
 * - subcategories + categories: deleting either cascade-soft-deletes the
 *   recommendations hanging off them (`softDeleteSubcategoryDependents`)
 * - the sector/subsector catalog: their `sectorName`/`subsectorName` are embedded
 *   in the response, and soft-deleting a sector/subsector cascade-soft-deletes the
 *   recommendations referencing it.
 */
export const subcategoryRecommendationKeys = {
  list: (methodologyId: string | undefined) =>
    [
      MaintainerQueryKey.Root,
      MaintainerQueryKey.SubcategoryRecommendations,
      methodologyId ?? null,
      MaintainerQueryKey.SubcategoryRecommendationsUpdateDependency,
      MaintainerQueryKey.SubcategoriesUpdateDependency,
      MaintainerQueryKey.CategoriesUpdateDependency,
      CountrySectorQueryKey.CatalogUpdateDependency,
      CountrySubsectorQueryKey.CatalogUpdateDependency,
    ] as const,
};
