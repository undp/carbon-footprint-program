import { createFileRoute } from "@tanstack/react-router";
import { EmissionSummaryScreen } from "@/screens/CarbonInventory/EmissionSummaryScreen";
import { RouteIds } from "@/interfaces";

export const Route = createFileRoute(
  RouteIds.CARBON_INVENTORY_EMISSION_SUMMARY
)({
  component: EmissionSummaryScreen,
});
