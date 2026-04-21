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
  initiatives: {
    all: ["maintainer", "initiatives"] as const,
  },
};
