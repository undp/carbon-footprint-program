export const carbonInventorySubcategoryKeys = {
  all: ["carbonInventorySubcategories"] as const,
  list: (carbonInventoryId: string) =>
    [...carbonInventorySubcategoryKeys.all, carbonInventoryId] as const,
};
