import type { AdminListStatusFilter } from "@repo/types";

export enum CountryOrganizationSizeQueryKey {
  Root = "countryOrganizationSizes",
  App = "app",
  Admin = "admin",
  CatalogUpdateDependency = "country-organization-size-catalog-update-dependency",
}

export const countryOrganizationSizeKeys = {
  app: [
    CountryOrganizationSizeQueryKey.Root,
    CountryOrganizationSizeQueryKey.App,
    CountryOrganizationSizeQueryKey.CatalogUpdateDependency,
  ] as const,
  admin: (status: AdminListStatusFilter) =>
    [
      CountryOrganizationSizeQueryKey.Root,
      CountryOrganizationSizeQueryKey.Admin,
      status,
      CountryOrganizationSizeQueryKey.CatalogUpdateDependency,
    ] as const,
};
