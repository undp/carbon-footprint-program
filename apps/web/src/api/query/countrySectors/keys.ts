import type { AdminListStatusFilter } from "@repo/types";

export enum CountrySectorQueryKey {
  Root = "countrySectors",
  App = "app",
  Admin = "admin",
  // Dependency tag included in every cache key. Mutations invalidate by
  // `predicate` matching this tag so app + admin queries refresh together.
  CatalogUpdateDependency = "country-sector-catalog-update-dependency",
}

export const countrySectorKeys = {
  app: [
    CountrySectorQueryKey.Root,
    CountrySectorQueryKey.App,
    CountrySectorQueryKey.CatalogUpdateDependency,
  ] as const,
  admin: (status: AdminListStatusFilter) =>
    [
      CountrySectorQueryKey.Root,
      CountrySectorQueryKey.Admin,
      status,
      CountrySectorQueryKey.CatalogUpdateDependency,
    ] as const,
};
