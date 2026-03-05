import { OrganizationRole } from "@repo/types";

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  [OrganizationRole.ADMIN]: "Administrador",
  [OrganizationRole.CONTRIBUTOR]: "Colaborador",
  [OrganizationRole.VIEWER]: "Lector",
};

export const ROLE_OPTIONS = (
  Object.entries(ROLE_LABELS) as [OrganizationRole, string][]
).map(([value, label]) => ({ label, value }));
