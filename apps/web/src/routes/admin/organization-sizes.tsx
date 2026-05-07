import { createFileRoute } from "@tanstack/react-router";
import { OrganizationSizesMaintainerScreen } from "@/screens/Maintainer/screens/OrganizationSizesMaintainerScreen";

export const Route = createFileRoute("/admin/organization-sizes")({
  component: () => <OrganizationSizesMaintainerScreen />,
});
