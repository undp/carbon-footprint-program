import { createFileRoute } from "@tanstack/react-router";
import { EmissionSummaryScreen } from "@/screens/CarbonInventory/EmissionSummaryScreen";
import { Routes } from "@/interfaces";

export const Route = createFileRoute(Routes.CARBON_INVENTORY_EMISSION_SUMMARY)({
  component: EmissionSummaryScreen,
});
