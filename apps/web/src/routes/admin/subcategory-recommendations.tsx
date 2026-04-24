import { createFileRoute } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { SubcategoryRecommendationsMaintainerScreen } from "@/screens/Maintainer/screens/SubcategoryRecommendationsMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_SUBCATEGORY_RECOMMENDATIONS)({
  beforeLoad: requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], {
    redirectTo: Routes.ADMIN_DASHBOARD,
  }),
  component: SubcategoryRecommendationsMaintainerScreen,
});
