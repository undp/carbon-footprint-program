import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { CreateReductionProjectScreen } from "@/screens/ReductionProject";

export const Route = createFileRoute(Routes.REDUCTION_PROJECT_NEW)({
  component: CreateReductionProjectScreen,
});
