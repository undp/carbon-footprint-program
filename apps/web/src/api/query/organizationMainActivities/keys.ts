import { GetAllOrganizationMainActivitiesQuery } from "@repo/types";

export const organizationMainActivityKeys = {
  all: ["organizationMainActivities"] as const,
  list: (filters?: GetAllOrganizationMainActivitiesQuery) =>
    [
      ...organizationMainActivityKeys.all,
      filters?.sectorId ?? null,
      filters?.subsectorId ?? null,
    ] as const,
};
