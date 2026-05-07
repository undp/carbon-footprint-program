import { createFileRoute } from "@tanstack/react-router";
import { EmissionResultsScreen } from "@/screens/CarbonInventory/EmissionResultsScreen";
import { RouteIds } from "@/interfaces";

export const Route = createFileRoute(
  RouteIds.CARBON_INVENTORY_EMISSION_RESULTS
)({
  component: EmissionResultsScreen,
});
