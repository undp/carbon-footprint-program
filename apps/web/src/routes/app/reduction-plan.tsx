import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";

export const Route = createFileRoute(Routes.REDUCTION_PLAN)({
  component: () => (
    <MainLayout>
      {/* TODO: Replace with real Reduction Plan screen component */}
      <div>Hello &quot;/reduction-plan&quot;!</div>
    </MainLayout>
  ),
});
