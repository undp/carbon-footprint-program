import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces";
import { ReductionProjectsScreen } from "@/screens/ReductionProjects";

export const Route = createFileRoute(RouteIds.REDUCTION_PROJECTS_INDEX)({
  component: ReductionProjectsScreen,
});
