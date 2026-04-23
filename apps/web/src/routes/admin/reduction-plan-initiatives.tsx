import { createFileRoute } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { ReductionPlanInitiativesMaintainerScreen } from "@/screens/Maintainer/screens/ReductionPlanInitiativesMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_REDUCTION_PLAN_INITIATIVES)({
  beforeLoad: requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], {
    redirectTo: Routes.ADMIN_DASHBOARD,
  }),
  component: ReductionPlanInitiativesMaintainerScreen,
});
