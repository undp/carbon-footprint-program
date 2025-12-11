import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { BusinessProfilingScreen } from "@/screens/FootprintCalculator/BusinessProfilingScreen";

export const Route = createFileRoute(Routes.CARBON_FOOTPRINT)({
  component: () => <BusinessProfilingScreen />,
});
