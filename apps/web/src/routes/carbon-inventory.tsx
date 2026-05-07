import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces/routes";

export const Route = createFileRoute(RouteIds.CARBON_INVENTORY)({
  component: () => <Outlet />,
});
