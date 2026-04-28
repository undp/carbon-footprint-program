import { OrganizationRole } from "@repo/types";

export const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  [OrganizationRole.ADMIN]: "Administrador",
  [OrganizationRole.CONTRIBUTOR]: "Colaborador",
  [OrganizationRole.VIEWER]: "Lector",
};
