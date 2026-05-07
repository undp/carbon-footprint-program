import { createFileRoute } from "@tanstack/react-router";
import { ReductionPlanInitiativesMaintainerScreen } from "@/screens/Maintainer/screens/ReductionPlanInitiativesMaintainerScreen";

export const Route = createFileRoute("/admin/reduction-plan-initiatives")({
  component: ReductionPlanInitiativesMaintainerScreen,
});
