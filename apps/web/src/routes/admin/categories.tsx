import { createFileRoute } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { RouteIds, Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { CategoriesMaintainerScreen } from "@/screens/Maintainer/screens/CategoriesMaintainerScreen";

export const Route = createFileRoute(RouteIds.ADMIN_CATEGORIES)({
  beforeLoad: requireRole([SystemRole.SUPERADMIN], {
    redirectTo: Routes.ADMIN_DASHBOARD,
  }),
  component: CategoriesMaintainerScreen,
});
