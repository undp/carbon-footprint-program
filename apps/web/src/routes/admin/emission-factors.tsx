import { createFileRoute } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { EmissionFactorsMaintainerScreen } from "@/screens/Maintainer/screens/EmissionFactorsMaintainerScreen";

export const Route = createFileRoute("/admin/emission-factors")({
  beforeLoad: requireRole([SystemRole.SUPERADMIN], {
    redirectTo: Routes.ADMIN_DASHBOARD,
  }),
  component: EmissionFactorsMaintainerScreen,
});
