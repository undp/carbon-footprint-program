import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces";
import { ReductionProjectScreen } from "@/screens/ReductionProject";

export const Route = createFileRoute(RouteIds.REDUCTION_PROJECT_DETAILS)({
  component: () => <ReductionProjectScreen mode="view" />,
});
