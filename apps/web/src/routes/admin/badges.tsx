import { createFileRoute } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { RouteIds, Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { BadgesScreen } from "@/screens/Maintainer/screens/Badges/BadgesScreen";

export const Route = createFileRoute(RouteIds.ADMIN_BADGES)({
  beforeLoad: requireRole([SystemRole.SUPERADMIN], {
    redirectTo: Routes.ADMIN_DASHBOARD,
  }),
  component: BadgesScreen,
});
