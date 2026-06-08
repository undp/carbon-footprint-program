import { OrganizationRole, SystemRole } from "@repo/types";
import { CustomPaletteConfig } from "./types";

type RoleLabelEntry = Pick<CustomPaletteConfig, "label" | "tooltip">;

export const SYSTEM_ROLE_LABELS: Record<SystemRole, RoleLabelEntry> = {
  [SystemRole.USER]: {
    label: "Usuario",
    tooltip: "Usuario estándar sin permisos administrativos",
  },
  [SystemRole.ADMIN]: {
    label: "Admin",
    tooltip: "Administrador con acceso al panel admin",
  },
  [SystemRole.SUPERADMIN]: {
    label: "Superadmin",
    tooltip: "Super administrador con permisos completos",
  },
};

export const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  [OrganizationRole.ADMIN]: "Administrador",
  [OrganizationRole.CONTRIBUTOR]: "Colaborador",
  [OrganizationRole.VIEWER]: "Lector",
};
