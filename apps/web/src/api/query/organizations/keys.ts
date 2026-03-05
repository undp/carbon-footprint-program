export const organizationKeys = {
  all: ["organizations"] as const,
  admin: () => [...organizationKeys.all, "admin"] as const,
  adminAll: () => [...organizationKeys.admin(), "all"] as const,
  adminKpis: () => [...organizationKeys.admin(), "kpis"] as const,
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
};
