import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces";
import { CarbonInventoriesScreen } from "@/screens/CarbonInventories";
export const Route = createFileRoute(RouteIds.CARBON_INVENTORIES)({
  component: CarbonInventoriesScreen,
});
