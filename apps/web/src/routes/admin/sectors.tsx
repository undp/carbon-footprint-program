import { createFileRoute } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { SectorsMaintainerScreen } from "@/screens/Maintainer/screens/SectorsMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_SECTORS)({
  beforeLoad: requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], {
    redirectTo: Routes.ADMIN_DASHBOARD,
  }),
  component: () => <SectorsMaintainerScreen />,
});
