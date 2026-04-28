import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { SubsectorsMaintainerScreen } from "@/screens/Maintainer/screens/SubsectorsMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_SUBSECTORS)({
  component: () => <SubsectorsMaintainerScreen />,
});
