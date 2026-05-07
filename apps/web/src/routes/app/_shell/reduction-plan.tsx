import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces";
import { ReductionPlanScreen } from "@/screens/ReductionPlan";
import { z } from "zod";

const searchParams = z.object({
  carbonInventoryId: z.string().optional(),
  organizationId: z.string().optional(),
});

export const Route = createFileRoute(RouteIds.REDUCTION_PLAN)({
  validateSearch: searchParams,
  component: ReductionPlanScreen,
});
