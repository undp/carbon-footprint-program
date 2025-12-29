import { createFileRoute } from "@tanstack/react-router";
import { SubcategoryPreselectionScreen } from "@/screens/CarbonInventory/SubcategoryPreselectionScreen";
import { Routes } from "@/interfaces";

export const Route = createFileRoute(
  Routes.CARBON_INVENTORY_SUB_CATEGORY_PRESELECTION
)({
  component: () => <SubcategoryPreselectionScreen />,
});
