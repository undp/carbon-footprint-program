import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { DimensionsMaintainerScreen } from "@/screens/Maintainer/screens/DimensionsMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_DIMENSIONS)({
  component: DimensionsMaintainerScreen,
});
