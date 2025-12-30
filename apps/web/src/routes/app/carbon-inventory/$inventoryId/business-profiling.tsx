import { createFileRoute } from "@tanstack/react-router";
import { BusinessProfilingScreen } from "@/screens/CarbonInventory/BusinessProfilingScreen";
import { Routes } from "@/interfaces";

export const Route = createFileRoute(
  Routes.CARBON_INVENTORY_BUSINESS_PROFILING
)({
  component: () => <BusinessProfilingScreen />,
});
