export const carbonInventoryKeys = {
  all: ["carbonInventories"] as const,
  detail: (id: string) => ["carbonInventories", id] as const,
};
