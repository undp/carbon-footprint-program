import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { UnderConstructionScreen } from "@/screens/Maintainer/screens/UnderConstructionScreen";

export const Route = createFileRoute(Routes.ADMIN_CHANGE_HISTORY)({
  component: () => <UnderConstructionScreen />,
});
