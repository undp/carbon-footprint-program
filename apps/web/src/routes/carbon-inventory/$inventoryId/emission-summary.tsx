import { createFileRoute } from "@tanstack/react-router";
import { EmissionSummaryScreen } from "@/screens/CarbonInventory/EmissionSummaryScreen";

export const Route = createFileRoute(
  "/carbon-inventory/$inventoryId/emission-summary"
)({
  component: EmissionSummaryScreen,
});
