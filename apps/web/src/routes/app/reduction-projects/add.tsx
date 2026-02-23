import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { AddReductionProjectScreen } from "@/screens/ReductionProjects";

export const Route = createFileRoute(Routes.ADD_REDUCTION_PROJECT)({
  component: AddReductionProjectScreen,
});
