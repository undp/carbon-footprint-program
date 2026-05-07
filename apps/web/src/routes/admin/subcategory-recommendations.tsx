import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces/routes";
import { SubcategoryRecommendationsMaintainerScreen } from "@/screens/Maintainer/screens/SubcategoryRecommendationsMaintainerScreen";

// Role validation is handled by the parent `admin.tsx` route
// (requires ADMIN or SUPERADMIN), so no additional `beforeLoad` is needed here.
export const Route = createFileRoute(
  RouteIds.ADMIN_SUBCATEGORY_RECOMMENDATIONS
)({
  component: SubcategoryRecommendationsMaintainerScreen,
});
