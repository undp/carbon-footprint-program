export const submissionsKeys = {
  detail: (id: string) => ["submissions", "detail", id] as const,
  carbonInventoryHistory: (carbonInventoryId: string) =>
    ["submissions", "carbon-inventory-history", carbonInventoryId] as const,
  organizationHistory: (organizationId: string) =>
    ["submissions", "organization-history", organizationId] as const,
};
