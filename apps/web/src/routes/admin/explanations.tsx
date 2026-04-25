import { createFileRoute } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { ExplanationsMaintainerScreen } from "@/screens/Maintainer/screens/ExplanationsMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_EXPLANATIONS)({
  beforeLoad: requireRole([SystemRole.SUPERADMIN, SystemRole.ADMIN], {
    redirectTo: Routes.ADMIN_DASHBOARD,
  }),
  component: ExplanationsMaintainerScreen,
});
