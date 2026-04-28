import type { AdminListStatusFilter } from "@repo/types";

export enum CountrySubsectorQueryKey {
  Root = "countrySubsectors",
  App = "app",
  Admin = "admin",
  CatalogUpdateDependency = "country-subsector-catalog-update-dependency",
}

export const countrySubsectorKeys = {
  app: [
    CountrySubsectorQueryKey.Root,
    CountrySubsectorQueryKey.App,
    CountrySubsectorQueryKey.CatalogUpdateDependency,
  ] as const,
  admin: (status: AdminListStatusFilter) =>
    [
      CountrySubsectorQueryKey.Root,
      CountrySubsectorQueryKey.Admin,
      status,
      CountrySubsectorQueryKey.CatalogUpdateDependency,
    ] as const,
};
