import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces/routes";
import { DimensionsMaintainerScreen } from "@/screens/Maintainer/screens/DimensionsMaintainerScreen";

export const Route = createFileRoute(RouteIds.ADMIN_DIMENSIONS)({
  component: DimensionsMaintainerScreen,
});
