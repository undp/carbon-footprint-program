import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { ReductionPlanInitiativesMaintainerScreen } from "@/screens/Maintainer/screens/ReductionPlanInitiativesMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_REDUCTION_PLAN_INITIATIVES)({
  component: ReductionPlanInitiativesMaintainerScreen,
});
