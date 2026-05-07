import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { RouteLoadingFallback } from "@/components/RouteLoadingFallback";
import { RouteIds } from "@/interfaces";

export const Route = createFileRoute(RouteIds.APP_SHELL)({
  pendingComponent: () => (
    <MainLayout>
      <RouteLoadingFallback />
    </MainLayout>
  ),
  component: () => (
    <MainLayout>
      <Outlet />
    </MainLayout>
  ),
});
