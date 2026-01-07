export const methodologyKeys = {
  all: ["methodologies"] as const,
  detail: (carbonInventoryId: string) =>
    [...methodologyKeys.all, carbonInventoryId] as const,
};
