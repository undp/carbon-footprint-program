import { createFileRoute } from "@tanstack/react-router";
import { SubcategoryPreselectionScreen } from "@/screens/CarbonInventory/SubcategoryPreselectionScreen";
import { RouteIds } from "@/interfaces";

export const Route = createFileRoute(
  RouteIds.CARBON_INVENTORY_SUBCATEGORY_PRESELECTION
)({
  component: SubcategoryPreselectionScreen,
});
