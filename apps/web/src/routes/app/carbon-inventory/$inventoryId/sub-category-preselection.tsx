import { createFileRoute } from "@tanstack/react-router";
import { SubCategoryPreselectionScreen } from "@/screens/FootprintCalculator/SubCategoryPreselectionScreen";
import { Routes } from "@/interfaces";

export const Route = createFileRoute(
  Routes.CARBON_INVENTORY_SUB_CATEGORY_PRESELECTION
)({
  component: () => <SubCategoryPreselectionScreen />,
});
