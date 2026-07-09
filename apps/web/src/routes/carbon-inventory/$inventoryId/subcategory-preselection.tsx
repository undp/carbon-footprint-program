import { createFileRoute } from "@tanstack/react-router";
import { SubcategoryPreselectionScreen } from "@/screens/CarbonInventory/SubcategoryPreselectionScreen";

export const Route = createFileRoute(
  "/carbon-inventory/$inventoryId/subcategory-preselection"
)({
  component: SubcategoryPreselectionScreen,
});
