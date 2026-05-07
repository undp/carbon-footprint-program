import { createFileRoute } from "@tanstack/react-router";
import { BusinessProfilingScreen } from "@/screens/CarbonInventory/BusinessProfilingScreen";
import { RouteIds } from "@/interfaces";

export const Route = createFileRoute(
  RouteIds.CARBON_INVENTORY_BUSINESS_PROFILING
)({
  component: BusinessProfilingScreen,
});
