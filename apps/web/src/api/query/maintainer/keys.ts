export enum MaintainerQueryKey {
  Root = "maintainer",
  // identity segments
  Methodologies = "methodologies",
  Categories = "categories",
  Subcategories = "subcategories",
  EmissionFactors = "emissionFactors",
  EmissionFactorDimensions = "emissionFactorDimensions",
  ReductionPlanInitiatives = "reductionPlanInitiatives",
  Explanations = "explanations",
  MeasurementUnits = "measurementUnits",
  Magnitudes = "magnitudes",
  // dependency tokens
  MethodologiesUpdateDependency = "maintainerMethodologiesUpdateDependency",
  CategoriesUpdateDependency = "maintainerCategoriesUpdateDependency",
  SubcategoriesUpdateDependency = "maintainerSubcategoriesUpdateDependency",
  EmissionFactorsUpdateDependency = "maintainerEmissionFactorsUpdateDependency",
  DimensionsUpdateDependency = "maintainerDimensionsUpdateDependency",
  ReductionPlanInitiativesUpdateDependency = "maintainerReductionPlanInitiativesUpdateDependency",
  ExplanationsUpdateDependency = "maintainerExplanationsUpdateDependency",
  MeasurementUnitsUpdateDependency = "maintainerMeasurementUnitsUpdateDependency",
  MagnitudesUpdateDependency = "maintainerMagnitudesUpdateDependency",
}

/**
 * Maintainer query keys following the dependency-token pattern (see
 * carbonInventories/keys.ts). Each key embeds the `*UpdateDependency` tokens of
 * every entity it depends on; mutations invalidate by token via a predicate
 * (`query.queryKey.includes(token)`), so a new query opts into invalidation just
 * by composing its key — mutations never need to be touched again.
 *
 * Dependencies are derived from the backend response shapes (what each GET
 * embeds), not just rendered columns:
 * - subcategories embed category + measurement units
 * - emission factors embed subcategory (+category order), dimension values, rate unit
 * - dimensions embed subcategory + `subcategoryHasEmissionFactors` (from emission factors)
 * - measurement units compute `referenceCount` from subcategories + emission factors
 * - methodology detail embeds categories → subcategories
 */
export const maintainerKeys = {
  methodologies: {
    all: [
      MaintainerQueryKey.Root,
      MaintainerQueryKey.Methodologies,
      MaintainerQueryKey.MethodologiesUpdateDependency,
    ] as const,
    detail: (id: string) =>
      [
        MaintainerQueryKey.Root,
        MaintainerQueryKey.Methodologies,
        id,
        MaintainerQueryKey.MethodologiesUpdateDependency,
        MaintainerQueryKey.CategoriesUpdateDependency,
        MaintainerQueryKey.SubcategoriesUpdateDependency,
      ] as const,
  },
  categories: {
    all: (methodologyVersionId: string) =>
      [
        MaintainerQueryKey.Root,
        MaintainerQueryKey.Categories,
        methodologyVersionId,
        MaintainerQueryKey.CategoriesUpdateDependency,
      ] as const,
  },
  subcategories: {
    all: (methodologyVersionId: string) =>
      [
        MaintainerQueryKey.Root,
        MaintainerQueryKey.Subcategories,
        methodologyVersionId,
        MaintainerQueryKey.SubcategoriesUpdateDependency,
        MaintainerQueryKey.CategoriesUpdateDependency,
        MaintainerQueryKey.MeasurementUnitsUpdateDependency,
      ] as const,
  },
  emissionFactors: {
    all: (methodologyVersionId: string) =>
      [
        MaintainerQueryKey.Root,
        MaintainerQueryKey.EmissionFactors,
        methodologyVersionId,
        MaintainerQueryKey.EmissionFactorsUpdateDependency,
        MaintainerQueryKey.SubcategoriesUpdateDependency,
        MaintainerQueryKey.CategoriesUpdateDependency,
        MaintainerQueryKey.DimensionsUpdateDependency,
        MaintainerQueryKey.MeasurementUnitsUpdateDependency,
      ] as const,
  },
  emissionFactorDimensions: {
    all: (methodologyVersionId: string) =>
      [
        MaintainerQueryKey.Root,
        MaintainerQueryKey.EmissionFactorDimensions,
        methodologyVersionId,
        MaintainerQueryKey.DimensionsUpdateDependency,
        MaintainerQueryKey.EmissionFactorsUpdateDependency,
        MaintainerQueryKey.SubcategoriesUpdateDependency,
      ] as const,
  },
  reductionPlanInitiatives: {
    byMethodology: (methodologyVersionId: string) =>
      [
        MaintainerQueryKey.Root,
        MaintainerQueryKey.ReductionPlanInitiatives,
        methodologyVersionId,
        MaintainerQueryKey.ReductionPlanInitiativesUpdateDependency,
        MaintainerQueryKey.SubcategoriesUpdateDependency,
        MaintainerQueryKey.CategoriesUpdateDependency,
      ] as const,
  },
  explanations: {
    all: () =>
      [
        MaintainerQueryKey.Root,
        MaintainerQueryKey.Explanations,
        MaintainerQueryKey.ExplanationsUpdateDependency,
      ] as const,
  },
  measurementUnits: {
    all: [
      MaintainerQueryKey.Root,
      MaintainerQueryKey.MeasurementUnits,
      MaintainerQueryKey.MeasurementUnitsUpdateDependency,
      MaintainerQueryKey.MagnitudesUpdateDependency,
      MaintainerQueryKey.SubcategoriesUpdateDependency,
      MaintainerQueryKey.EmissionFactorsUpdateDependency,
    ] as const,
    detail: (id: string) =>
      [
        MaintainerQueryKey.Root,
        MaintainerQueryKey.MeasurementUnits,
        id,
        MaintainerQueryKey.MeasurementUnitsUpdateDependency,
        MaintainerQueryKey.MagnitudesUpdateDependency,
        MaintainerQueryKey.SubcategoriesUpdateDependency,
        MaintainerQueryKey.EmissionFactorsUpdateDependency,
      ] as const,
  },
  magnitudes: {
    all: [
      MaintainerQueryKey.Root,
      MaintainerQueryKey.Magnitudes,
      MaintainerQueryKey.MagnitudesUpdateDependency,
      MaintainerQueryKey.MeasurementUnitsUpdateDependency,
    ] as const,
    detail: (id: string) =>
      [
        MaintainerQueryKey.Root,
        MaintainerQueryKey.Magnitudes,
        id,
        MaintainerQueryKey.MagnitudesUpdateDependency,
        MaintainerQueryKey.MeasurementUnitsUpdateDependency,
      ] as const,
  },
};
