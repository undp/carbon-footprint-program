import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces";

export const Route = createFileRoute(RouteIds.REDUCTION_PROJECTS)({
  component: () => <Outlet />,
});
