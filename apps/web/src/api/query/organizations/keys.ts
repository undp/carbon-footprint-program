import { CarbonInventoryQueryKey } from "../carbonInventories/keys";

export const organizationKeys = {
  all: ["organizations", "organizationStatusDependency"] as const,
  admin: () => [...organizationKeys.all, "admin"] as const,
  adminAll: () =>
    [
      ...organizationKeys.admin(),
      "all",
      "organizationStatusDependency",
    ] as const,
  adminKpis: () =>
    [
      ...organizationKeys.admin(),
      "kpis",
      "organizationStatusDependency",
    ] as const,
  detail: (id: string) => [...organizationKeys.all, "detail", id] as const,
  create: ["createOrganization"] as const,
  update: ["updateOrganization"] as const,
  delete: ["deleteOrganization"] as const,
  accredit: ["accreditOrganization"] as const,
  users: (organizationId: string) =>
    [...organizationKeys.detail(organizationId), "users"] as const,
  addUser: ["addOrganizationUser"] as const,
  updateUser: (id: string) => [...organizationKeys.addUser, id] as const,
  deleteUser: (id: string) =>
    [...organizationKeys.addUser, "delete", id] as const,
  badges: (organizationId: string, year?: string, badgeTypes?: string[]) =>
    [
      ...organizationKeys.detail(organizationId),
      "badges",
      CarbonInventoryQueryKey.StatusUpdateDependency,
      year ?? null,
      badgeTypes ?? null,
    ] as const,
};
