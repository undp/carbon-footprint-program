export const carbonInventoryKeys = {
  all: ["carbonInventories"] as const,
  detail: (id: string) => ["carbonInventories", id] as const,
  methodology: (id: string) =>
    ["carbonInventories", id, "methodology"] as const,
  results: (id: string) => ["carbonInventories", id, "results"] as const,
  availableYears: ["carbonInventories", "availableYears"] as const,
};
