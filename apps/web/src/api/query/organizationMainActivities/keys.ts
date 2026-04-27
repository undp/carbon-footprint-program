import {
  AdminListStatusFilter,
  GetAllOrganizationMainActivitiesQuery,
} from "@repo/types";

/**
 * Query-key factory for organization main activities. The legacy `all`/`list` keys are
 * kept for backward compatibility with the public read consumers; the `admin` subtree
 * adds the admin list with `status` filter.
 */
export const organizationMainActivityKeys = {
  all: ["organizationMainActivities"] as const,
  list: (filters?: GetAllOrganizationMainActivitiesQuery) =>
    [
      "organizationMainActivities",
      filters?.sectorId ?? null,
      filters?.subsectorId ?? null,
    ] as const,
  app: {
    all: ["organizationMainActivities"] as const,
  },
  admin: {
    all: ["organizationMainActivities", "admin"] as const,
    list: (status: AdminListStatusFilter) =>
      ["organizationMainActivities", "admin", "list", status] as const,
  },
};
