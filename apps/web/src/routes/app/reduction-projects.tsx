import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";

export const Route = createFileRoute(Routes.REDUCTION_PROJECTS)({
  component: () => (
    <MainLayout>
      {/* TODO: Replace with real Reduction Projects screen component */}
      <div>Hello &quot;/reduction-projects&quot;!</div>
    </MainLayout>
  ),
});
