import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { AddReductionProjectScreen } from "@/screens/ReductionProjects/AddReductionProjectScreen";

export const Route = createFileRoute(Routes.ADD_REDUCTION_PROJECT)({
  component: () => <AddReductionProjectScreen />,
});
