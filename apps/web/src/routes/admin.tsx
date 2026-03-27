import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces/routes";
import { MaintainerLayout } from "@/screens/Maintainer/layout/MaintainerLayout";
import { requireRole } from "@/utils/requireRole";
import { RouteLoadingFallback } from "@/components/RouteLoadingFallback";

export const Route = createFileRoute(Routes.ADMIN)({
  beforeLoad: requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN]),
  pendingComponent: RouteLoadingFallback,
  component: () => (
    <MaintainerLayout>
      <Outlet />
    </MaintainerLayout>
  ),
});
