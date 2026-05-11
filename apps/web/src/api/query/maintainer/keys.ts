export const maintainerKeys = {
  methodologies: {
    all: ["maintainer", "methodologies"] as const,
  },
  categories: {
    all: (methodologyVersionId: string) =>
      ["maintainer", "categories", methodologyVersionId] as const,
  },
  subcategories: {
    all: (methodologyVersionId: string) =>
      ["maintainer", "subcategories", methodologyVersionId] as const,
  },
  emissionFactors: {
    all: (methodologyVersionId: string) =>
      ["maintainer", "emissionFactors", methodologyVersionId] as const,
  },
  emissionFactorDimensions: {
    all: (methodologyVersionId: string) =>
      ["maintainer", "emissionFactorDimensions", methodologyVersionId] as const,
  },
  reductionPlanInitiatives: {
    all: ["maintainer", "reductionPlanInitiatives"] as const,
    byMethodology: (methodologyVersionId: string) =>
      ["maintainer", "reductionPlanInitiatives", methodologyVersionId] as const,
  },
  explanations: {
    all: () => ["maintainer", "explanations"] as const,
  },
  measurementUnits: {
    all: ["maintainer", "measurementUnits"] as const,
    detail: (id: string) => ["maintainer", "measurementUnits", id] as const,
  },
  magnitudes: {
    all: ["maintainer", "magnitudes"] as const,
    detail: (id: string) => ["maintainer", "magnitudes", id] as const,
  },
};
