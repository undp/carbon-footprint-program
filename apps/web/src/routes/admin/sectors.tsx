import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces/routes";
import { SectorsMaintainerScreen } from "@/screens/Maintainer/screens/SectorsMaintainerScreen";

export const Route = createFileRoute(RouteIds.ADMIN_SECTORS)({
  component: () => <SectorsMaintainerScreen />,
});
