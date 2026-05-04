import { SystemRole } from "@repo/types";
import { VOCAB } from "@/config/vocab";
import capitalize from "lodash-es/capitalize";

export const USERS_SCREEN_TITLE = "Usuarios";
export const USERS_SCREEN_SUBTITLE =
  "Gestión de usuarios y roles de administrador";

export const TAB_LABELS = {
  usuarios: "Usuarios",
  administradores: "Administradores",
} as const;

export type TabKey = keyof typeof TAB_LABELS;

export const KPI_LABELS = {
  usuarios: "Usuarios",
  actividad: "Actividad",
  administradores: "Administradores",
  superAdministradores: "Super Administradores",
};

export const ROLE_LABELS: Record<SystemRole, string> = {
  [SystemRole.USER]: "Usuario",
  [SystemRole.ADMIN]: "Admin",
  [SystemRole.SUPERADMIN]: "Superadmin",
};

export const COLUMN_HEADERS = {
  name: "Nombre",
  email: "Correo",
  jobPosition: "Cargo",
  organizationsAndRoles: `${capitalize(VOCAB.organization.noun.plural)} y rol`,
  role: "Rol",
  createdAt: "Fecha de registro",
  actions: "Acciones",
};

export const ACTION_LABELS = {
  viewHistory: "Ver historial",
  changeRole: "Cambiar rol",
  promoteToAdmin: "Promover a admin",
};

export const DIALOG_COPY = {
  promoteTitle: "Promover usuario a administrador",
  promoteUserLabel: "Usuario",
  promoteRoleLabel: "Nuevo rol",
  promoteSubmit: "Promover",
  promoteSuccess: "Usuario promovido exitosamente",
  changeRoleTitle: "Cambiar rol",
  changeRoleLabel: "Nuevo rol",
  changeRoleSubmit: "Guardar",
  changeRoleSuccess: "Rol actualizado exitosamente",
  demoteWarning: "Esta acción revocará el rol de administrador.",
  historyTitle: "Historial de roles",
  historyEmpty: "Sin cambios de rol registrados.",
  cancelLabel: "Cancelar",
};

export const TOOLTIP_COPY = {
  lastSuperadmin: "Debe existir al menos un Super Administrador.",
  selfRoleChange: "No puedes cambiar tu propio rol.",
};

export const SUPERADMIN_COUNT_SUBTITLE = (count: number): string =>
  `${count} Super Administrador${count !== 1 ? "es" : ""}`;
