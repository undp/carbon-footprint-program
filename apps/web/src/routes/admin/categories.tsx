import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { CategoriesMaintainerScreen } from "@/screens/Maintainer/screens/CategoriesMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_CATEGORIES)({
  component: () => <CategoriesMaintainerScreen />,
});
