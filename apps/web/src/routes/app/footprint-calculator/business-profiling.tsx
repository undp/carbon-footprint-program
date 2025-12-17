import { createFileRoute } from "@tanstack/react-router";
import { BusinessProfilingScreen } from "@/screens/FootprintCalculator/BusinessProfilingScreen";

export const Route = createFileRoute(
  "/app/footprint-calculator/business-profiling"
)({
  component: () => <BusinessProfilingScreen />,
});
