import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { requireRole } from "@/utils/requireRole";
import { RouteLoadingFallback } from "@/components/RouteLoadingFallback";

export const Route = createFileRoute("/app")({
  beforeLoad: requireRole([
    SystemRole.USER,
    SystemRole.ADMIN,
    SystemRole.SUPERADMIN,
  ]),
  pendingComponent: RouteLoadingFallback,
  component: () => <Outlet />,
});
