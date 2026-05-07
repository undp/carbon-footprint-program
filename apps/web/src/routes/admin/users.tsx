import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SystemRole } from "@repo/types";
import { RouteIds, Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { UsersScreen } from "@/screens/Maintainer/screens/Users/UsersScreen";

const searchSchema = z.object({
  tab: z.enum(["usuarios", "administradores"]).optional().catch(undefined),
});

export const Route = createFileRoute(RouteIds.ADMIN_USERS)({
  validateSearch: searchSchema,
  beforeLoad: requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], {
    redirectTo: Routes.HOME,
  }),
  component: UsersScreen,
});
