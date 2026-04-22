import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";
import { ReductionPlanScreen } from "@/screens/ReductionPlan";
import { z } from "zod";

const searchParams = z.object({
  carbonInventoryId: z.string().optional(),
  organizationId: z.string().optional(),
});

export const Route = createFileRoute(Routes.REDUCTION_PLAN)({
  validateSearch: searchParams,
  component: () => (
    <MainLayout>
      <ReductionPlanScreen />
    </MainLayout>
  ),
});
