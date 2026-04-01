import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces/routes";
import { MaintainerLayout } from "@/screens/Maintainer/layout/MaintainerLayout";
import { requireRole } from "@/utils/requireRole";
import { RouteLoadingFallback } from "@/components/RouteLoadingFallback";

export const Route = createFileRoute(Routes.ADMIN_DASHBOARD)({
  beforeLoad: requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN]),
  pendingComponent: RouteLoadingFallback,
  component: () => (
    <MaintainerLayout>
      <Outlet />
    </MaintainerLayout>
  ),
  notFoundComponent: () => <Navigate to={Routes.ADMIN_DASHBOARD} />,
});
