import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { MainActivitiesMaintainerScreen } from "@/screens/Maintainer/screens/MainActivitiesMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_MAIN_ACTIVITIES)({
  component: () => <MainActivitiesMaintainerScreen />,
});
