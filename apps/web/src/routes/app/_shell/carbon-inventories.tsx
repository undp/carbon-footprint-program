import { createFileRoute } from "@tanstack/react-router";
import { CarbonInventoriesScreen } from "@/screens/CarbonInventories";
export const Route = createFileRoute("/app/_shell/carbon-inventories")({
  component: CarbonInventoriesScreen,
});
