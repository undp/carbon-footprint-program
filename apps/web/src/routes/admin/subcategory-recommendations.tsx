import { createFileRoute } from "@tanstack/react-router";
import { SubcategoryRecommendationsMaintainerScreen } from "@/screens/Maintainer/screens/SubcategoryRecommendationsMaintainerScreen";

// Role validation is handled by the parent `admin.tsx` route
// (requires ADMIN or SUPERADMIN), so no additional `beforeLoad` is needed here.
export const Route = createFileRoute("/admin/subcategory-recommendations")({
  component: SubcategoryRecommendationsMaintainerScreen,
});
