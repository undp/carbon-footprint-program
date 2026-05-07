import { createFileRoute } from "@tanstack/react-router";
import { EmissionCaptureScreen } from "@/screens/CarbonInventory/EmissionCaptureScreen";
import { RouteIds } from "@/interfaces";

export const Route = createFileRoute(
  RouteIds.CARBON_INVENTORY_EMISSION_CAPTURE
)({
  component: EmissionCaptureScreen,
});
