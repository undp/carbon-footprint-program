import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { SubcategoriesMaintainerScreen } from "@/screens/Maintainer/screens/SubcategoriesMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_SUBCATEGORIES)({
  component: SubcategoriesMaintainerScreen,
});
