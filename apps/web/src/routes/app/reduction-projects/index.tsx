import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { ReductionProjectsScreen } from "@/screens/ReductionProjects";

export const Route = createFileRoute(Routes.REDUCTION_PROJECTS)({
  component: ReductionProjectsScreen,
});
