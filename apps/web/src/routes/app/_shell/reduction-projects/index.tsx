import { createFileRoute } from "@tanstack/react-router";
import { ReductionProjectsScreen } from "@/screens/ReductionProjects";

export const Route = createFileRoute("/app/_shell/reduction-projects/")({
  component: ReductionProjectsScreen,
});
