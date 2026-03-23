export const subcategoryKeys = {
  all: (methodologyVersionId: string) =>
    ["subcategories", methodologyVersionId] as const,
};
