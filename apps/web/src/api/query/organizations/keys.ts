export const organizationKeys = {
  adminAll: ["admin", "organizations", "all"] as const,
  adminKpis: ["admin", "organizations", "kpis"] as const,
  all: ["organizations"] as const,
  detail: (id: string) => ["organization", id] as const,
  create: ["createOrganization"] as const,
  update: ["updateOrganization"] as const,
  delete: ["deleteOrganization"] as const,
  accredit: ["accreditOrganization"] as const,
  branches: ["branches"] as const,
  branch: (id: string) => [...organizationKeys.branches, id] as const,
  createBranch: ["createBranch"] as const,
  updateBranch: (id: string) => [...organizationKeys.createBranch, id] as const,
  users: ["organizationUsers"] as const,
  addUser: ["addOrganizationUser"] as const,
  updateUser: (id: string) => [...organizationKeys.addUser, id] as const,
  deleteUser: (id: string) =>
    [...organizationKeys.addUser, "delete", id] as const,
};
