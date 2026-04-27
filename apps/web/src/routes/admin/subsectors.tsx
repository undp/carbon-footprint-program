import { createFileRoute } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { SubsectorsMaintainerScreen } from "@/screens/Maintainer/screens/SubsectorsMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_SUBSECTORS)({
  beforeLoad: requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], {
    redirectTo: Routes.ADMIN_DASHBOARD,
  }),
  component: () => <SubsectorsMaintainerScreen />,
});
