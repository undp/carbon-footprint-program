import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { RequestsScreen } from "@/screens/Maintainer/screens/RequestsScreen";

export const Route = createFileRoute(Routes.ADMIN_REQUESTS)({
  component: () => <RequestsScreen />,
});
