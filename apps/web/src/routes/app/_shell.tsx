import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { RouteLoadingFallback } from "@/components/RouteLoadingFallback";

export const Route = createFileRoute("/app/_shell")({
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
