import { createFileRoute, redirect } from "@tanstack/react-router";
import { RouteIds, Routes } from "@/interfaces/routes";

export const Route = createFileRoute(RouteIds.CARBON_INVENTORY_INDEX)({
  beforeLoad: () => redirect({ to: Routes.CARBON_INVENTORIES }),
});
