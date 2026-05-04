import { SystemRole } from "@repo/database";

export const ALLOWED_ROLE_TRANSITIONS: Record<SystemRole, SystemRole[]> = {
  [SystemRole.USER]: [SystemRole.USER, SystemRole.ADMIN, SystemRole.SUPERADMIN],
  [SystemRole.ADMIN]: [
    SystemRole.USER,
    SystemRole.ADMIN,
    SystemRole.SUPERADMIN,
  ],
  [SystemRole.SUPERADMIN]: [
    SystemRole.USER,
    SystemRole.ADMIN,
    SystemRole.SUPERADMIN,
  ],
};
