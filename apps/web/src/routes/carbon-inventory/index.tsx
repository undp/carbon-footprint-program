import { createFileRoute, redirect } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";

export const Route = createFileRoute("/carbon-inventory/")({
  beforeLoad: () => redirect({ to: Routes.CARBON_INVENTORIES }),
});
