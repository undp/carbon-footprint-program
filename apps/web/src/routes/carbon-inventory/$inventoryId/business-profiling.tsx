import { createFileRoute } from "@tanstack/react-router";
import { BusinessProfilingScreen } from "@/screens/CarbonInventory/BusinessProfilingScreen";

export const Route = createFileRoute(
  "/carbon-inventory/$inventoryId/business-profiling"
)({
  component: BusinessProfilingScreen,
});
