import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces/routes";
import { MainActivitiesMaintainerScreen } from "@/screens/Maintainer/screens/MainActivitiesMaintainerScreen";

export const Route = createFileRoute(RouteIds.ADMIN_MAIN_ACTIVITIES)({
  component: () => <MainActivitiesMaintainerScreen />,
});
