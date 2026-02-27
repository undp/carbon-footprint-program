import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { AdminRequestsScreen } from "@/screens/Maintainer/screens/AdminRequestsScreen";

export const Route = createFileRoute(Routes.ADMIN_REQUESTS)({
  component: AdminRequestsScreen,
});
