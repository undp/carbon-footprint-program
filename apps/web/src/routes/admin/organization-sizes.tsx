import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces/routes";
import { OrganizationSizesMaintainerScreen } from "@/screens/Maintainer/screens/OrganizationSizesMaintainerScreen";

export const Route = createFileRoute(RouteIds.ADMIN_ORGANIZATION_SIZES)({
  component: () => <OrganizationSizesMaintainerScreen />,
});
