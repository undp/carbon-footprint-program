import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { AdminOrganizationsScreen } from "@/screens/Maintainer/screens/AdminOrganizationsScreen";

export const Route = createFileRoute(Routes.ADMIN_ORGANIZATIONS)({
  component: AdminOrganizationsScreen,
});
