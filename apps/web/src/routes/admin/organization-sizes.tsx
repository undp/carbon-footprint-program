import { createFileRoute } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { OrganizationSizesMaintainerScreen } from "@/screens/Maintainer/screens/OrganizationSizesMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_ORGANIZATION_SIZES)({
  beforeLoad: requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], {
    redirectTo: Routes.ADMIN_DASHBOARD,
  }),
  component: () => <OrganizationSizesMaintainerScreen />,
});
