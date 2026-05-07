import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces";

export const Route = createFileRoute(RouteIds.APP_FULLSCREEN)({
  component: () => <Outlet />,
});
