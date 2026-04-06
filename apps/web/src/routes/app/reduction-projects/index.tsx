import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";
import { ReductionProjectsScreen } from "@/screens/ReductionProjects";

export const Route = createFileRoute(Routes.REDUCTION_PROJECTS)({
  component: () => (
    <MainLayout>
      <ReductionProjectsScreen />
    </MainLayout>
  ),
});
