import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { ReductionProjectScreen } from "@/screens/ReductionProject";

export const Route = createFileRoute(Routes.REDUCTION_PROJECT_DETAILS)({
  component: () => <ReductionProjectScreen mode="view" />,
});
