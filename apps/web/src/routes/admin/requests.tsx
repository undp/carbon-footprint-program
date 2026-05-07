import { createFileRoute } from "@tanstack/react-router";
import { AdminRequestsScreen } from "@/screens/Maintainer/screens/AdminRequestsScreen";

// No beforeLoad guard needed — ADMIN/SUPERADMIN role check is enforced
// in the parent route (admin.tsx), which wraps all child routes via its Outlet.
export const Route = createFileRoute("/admin/requests")({
  component: AdminRequestsScreen,
});
