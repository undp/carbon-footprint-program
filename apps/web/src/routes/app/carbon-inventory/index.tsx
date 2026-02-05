import { createFileRoute, redirect } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";

export const Route = createFileRoute(Routes.CARBON_INVENTORY)({
  beforeLoad: () => redirect({ to: Routes.CARBON_INVENTORIES }),
});
