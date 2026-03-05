import { OrganizationRole } from "@repo/types";

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  [OrganizationRole.VIEWER]: "Lector",
  [OrganizationRole.CONTRIBUTOR]: "Editor",
  [OrganizationRole.ADMIN]: "Admin",
};

export const ROLE_OPTIONS = (
  Object.entries(ROLE_LABELS) as [OrganizationRole, string][]
).map(([value, label]) => ({ label, value }));
