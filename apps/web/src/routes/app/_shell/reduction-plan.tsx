import { createFileRoute } from "@tanstack/react-router";
import { ReductionPlanScreen } from "@/screens/ReductionPlan";
import { z } from "zod";

const searchParams = z.object({
  carbonInventoryId: z.string().optional(),
  organizationId: z.string().optional(),
});

export const Route = createFileRoute("/app/_shell/reduction-plan")({
  validateSearch: searchParams,
  component: ReductionPlanScreen,
});
