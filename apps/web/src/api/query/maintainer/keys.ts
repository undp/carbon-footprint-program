export const maintainerKeys = {
  methodologies: {
    all: ["maintainer", "methodologies"] as const,
  },
  categories: {
    all: (methodologyVersionId: string) =>
      ["maintainer", "categories", methodologyVersionId] as const,
  },
};
