import { createFileRoute } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { RouteIds, Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { EmissionFactorsMaintainerScreen } from "@/screens/Maintainer/screens/EmissionFactorsMaintainerScreen";

export const Route = createFileRoute(RouteIds.ADMIN_EMISSION_FACTORS)({
  beforeLoad: requireRole([SystemRole.SUPERADMIN], {
    redirectTo: Routes.ADMIN_DASHBOARD,
  }),
  component: EmissionFactorsMaintainerScreen,
});
