import { createFileRoute } from "@tanstack/react-router";
import { EmissionResultsScreen } from "@/screens/CarbonInventory/EmissionResultsScreen";

export const Route = createFileRoute(
  "/app/carbon-inventory/$inventoryId/emission-results"
)({
  component: EmissionResultsScreen,
});
