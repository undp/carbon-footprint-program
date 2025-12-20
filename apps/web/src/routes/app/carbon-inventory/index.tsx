import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { CarbonInventoriesListScreen } from "@/screens/FootprintCalculator/CarbonInventoriesListScreen";

export const Route = createFileRoute(Routes.CARBON_INVENTORY)({
  component: () => <CarbonInventoriesListScreen />,
});
