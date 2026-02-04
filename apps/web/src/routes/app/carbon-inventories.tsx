import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { CarbonInventoriesScreen } from "@/screens/CarbonInventories";
export const Route = createFileRoute(Routes.CARBON_INVENTORIES)({
  component: CarbonInventoriesScreen,
});
