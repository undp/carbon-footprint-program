import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { OrganizationSizesMaintainerScreen } from "@/screens/Maintainer/screens/OrganizationSizesMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_ORGANIZATION_SIZES)({
  component: () => <OrganizationSizesMaintainerScreen />,
});
