import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";
import { ReductionPlanScreen } from "@/screens/ReductionPlan";

export const Route = createFileRoute(Routes.REDUCTION_PLAN)({
  component: () => (
    <MainLayout>
      <ReductionPlanScreen />
    </MainLayout>
  ),
});
