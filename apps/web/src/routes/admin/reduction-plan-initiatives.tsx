import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces/routes";
import { ReductionPlanInitiativesMaintainerScreen } from "@/screens/Maintainer/screens/ReductionPlanInitiativesMaintainerScreen";

export const Route = createFileRoute(RouteIds.ADMIN_REDUCTION_PLAN_INITIATIVES)(
  {
    component: ReductionPlanInitiativesMaintainerScreen,
  }
);
