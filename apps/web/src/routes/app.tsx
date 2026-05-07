import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { requireRole } from "@/utils/requireRole";
import { RouteLoadingFallback } from "@/components/RouteLoadingFallback";
import { RouteIds, Routes } from "@/interfaces";

export const Route = createFileRoute(RouteIds.APP)({
  beforeLoad: requireRole(
    [SystemRole.USER, SystemRole.ADMIN, SystemRole.SUPERADMIN],
    {
      redirectTo: Routes.LANDING,
    }
  ),
  pendingComponent: () => <RouteLoadingFallback />,
  component: () => <Outlet />,
  notFoundComponent: () => <Navigate to={Routes.APP} />,
});
