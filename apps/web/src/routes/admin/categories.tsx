import { createFileRoute } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { CategoriesMaintainerScreen } from "@/screens/Maintainer/screens/CategoriesMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_CATEGORIES)({
  beforeLoad: requireRole([SystemRole.SUPERADMIN], {
    redirectTo: Routes.ADMIN,
  }),
  component: CategoriesMaintainerScreen,
});
