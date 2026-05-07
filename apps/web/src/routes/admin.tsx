import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { RouteIds, Routes } from "@/interfaces/routes";
import { MaintainerLayout } from "@/screens/Maintainer/layout/MaintainerLayout";
import { requireRole } from "@/utils/requireRole";
import { RouteLoadingFallback } from "@/components/RouteLoadingFallback";

export const Route = createFileRoute(RouteIds.ADMIN)({
  beforeLoad: requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], {
    redirectTo: Routes.HOME,
  }),
  pendingComponent: () => (
    <MaintainerLayout>
      <RouteLoadingFallback />
    </MaintainerLayout>
  ),
  component: () => (
    <MaintainerLayout>
      <Outlet />
    </MaintainerLayout>
  ),
  notFoundComponent: () => <Navigate to={Routes.ADMIN} />,
});
