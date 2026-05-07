import { createFileRoute } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { RouteIds, Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { SubcategoriesMaintainerScreen } from "@/screens/Maintainer/screens/SubcategoriesMaintainerScreen";

export const Route = createFileRoute(RouteIds.ADMIN_SUBCATEGORIES)({
  beforeLoad: requireRole([SystemRole.SUPERADMIN], {
    redirectTo: Routes.ADMIN_DASHBOARD,
  }),
  component: SubcategoriesMaintainerScreen,
});
