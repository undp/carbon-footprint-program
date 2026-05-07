import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces/routes";
import { AdminOrganizationsScreen } from "@/screens/Maintainer/screens/AdminOrganizationsScreen";

// No beforeLoad guard needed — ADMIN/SUPERADMIN role check is enforced
// in the parent route (admin.tsx), which wraps all child routes via its Outlet.
export const Route = createFileRoute(RouteIds.ADMIN_ORGANIZATIONS)({
  component: AdminOrganizationsScreen,
});
