import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { SectorsMaintainerScreen } from "@/screens/Maintainer/screens/SectorsMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_SECTORS)({
  component: () => <SectorsMaintainerScreen />,
});
