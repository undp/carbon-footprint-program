import { createFileRoute } from "@tanstack/react-router";
import { EmissionCaptureScreen } from "@/screens/CarbonInventory/EmissionCaptureScreen";

export const Route = createFileRoute(
  "/carbon-inventory/$inventoryId/emission-capture"
)({
  component: EmissionCaptureScreen,
});
