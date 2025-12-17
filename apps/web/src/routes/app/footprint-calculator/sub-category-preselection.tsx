import { createFileRoute } from "@tanstack/react-router";
import { SubCategoryPreselectionScreen } from "@/screens/FootprintCalculator/SubCategoryPreselectionScreen";

export const Route = createFileRoute(
  "/app/footprint-calculator/sub-category-preselection"
)({
  component: () => <SubCategoryPreselectionScreen />,
});
