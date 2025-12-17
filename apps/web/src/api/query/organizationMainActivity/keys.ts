type Filters = {
  sectorId?: string;
  subsectorId?: string;
};

export const organizationMainActivityKeys = {
  all: ["organizationMainActivities"] as const,
  list: (filters?: Filters) =>
    [
      ...organizationMainActivityKeys.all,
      filters?.sectorId ?? null,
      filters?.subsectorId ?? null,
    ] as const,
};
