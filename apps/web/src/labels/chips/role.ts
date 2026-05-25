import { OrganizationRole, SystemRole } from "@repo/types";
import { CustomPaletteConfig } from "./types";

type RoleLabelEntry = Pick<
  CustomPaletteConfig,
  "label" | "tooltip" | "sortOrder"
>;

export const SYSTEM_ROLE_LABELS: Record<SystemRole, RoleLabelEntry> = {
  [SystemRole.USER]: {
    label: "Usuario",
    tooltip: "Usuario estándar sin permisos administrativos",
    sortOrder: 0,
  },
  [SystemRole.ADMIN]: {
    label: "Admin",
    tooltip: "Administrador con acceso al panel admin",
    sortOrder: 1,
  },
  [SystemRole.SUPERADMIN]: {
    label: "Superadmin",
    tooltip: "Super administrador con permisos completos",
    sortOrder: 2,
  },
};

export const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  [OrganizationRole.ADMIN]: "Administrador",
  [OrganizationRole.CONTRIBUTOR]: "Colaborador",
  [OrganizationRole.VIEWER]: "Lector",
};
