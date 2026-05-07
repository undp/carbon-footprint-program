import { createFileRoute } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { RouteIds, Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { UnderConstructionScreen } from "@/screens/Maintainer/screens/UnderConstructionScreen";

export const Route = createFileRoute(RouteIds.ADMIN_PARAMETERS)({
  beforeLoad: requireRole([SystemRole.SUPERADMIN], {
    redirectTo: Routes.ADMIN_DASHBOARD,
  }),
  component: () => <UnderConstructionScreen />,
});
