import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces/routes";
import { SubsectorsMaintainerScreen } from "@/screens/Maintainer/screens/SubsectorsMaintainerScreen";

export const Route = createFileRoute(RouteIds.ADMIN_SUBSECTORS)({
  component: () => <SubsectorsMaintainerScreen />,
});
