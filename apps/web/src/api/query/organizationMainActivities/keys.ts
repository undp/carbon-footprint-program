import {
  AdminListStatusFilter,
  GetAllOrganizationMainActivitiesQuery,
} from "@repo/types";

export enum OrganizationMainActivityQueryKey {
  Root = "organizationMainActivities",
  App = "app",
  Admin = "admin",
  CatalogUpdateDependency = "organization-main-activity-catalog-update-dependency",
}

export const organizationMainActivityKeys = {
  app: (filters?: GetAllOrganizationMainActivitiesQuery) =>
    [
      OrganizationMainActivityQueryKey.Root,
      OrganizationMainActivityQueryKey.App,
      filters?.sectorId ?? null,
      filters?.subsectorId ?? null,
      OrganizationMainActivityQueryKey.CatalogUpdateDependency,
    ] as const,
  admin: (status: AdminListStatusFilter) =>
    [
      OrganizationMainActivityQueryKey.Root,
      OrganizationMainActivityQueryKey.Admin,
      status,
      OrganizationMainActivityQueryKey.CatalogUpdateDependency,
    ] as const,
};
