import { createFileRoute } from "@tanstack/react-router";
import { EmissionCaptureScreen } from "@/screens/CarbonInventory/EmissionCaptureScreen";
import { Routes } from "@/interfaces";

export const Route = createFileRoute(Routes.CARBON_INVENTORY_EMISSION_CAPTURE)({
  component: () => <EmissionCaptureScreen />,
});
