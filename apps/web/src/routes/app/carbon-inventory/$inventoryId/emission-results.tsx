import { createFileRoute } from "@tanstack/react-router";
import { EmissionResultsScreen } from "@/screens/CarbonInventory/EmissionResultsScreen";
import { Routes } from "@/interfaces";

export const Route = createFileRoute(Routes.CARBON_INVENTORY_EMISSION_RESULTS)({
  component: EmissionResultsScreen,
});
