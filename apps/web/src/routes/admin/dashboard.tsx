import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardScreen } from "@/screens/AdminDashboard";
import { Routes } from "@/interfaces";

// No beforeLoad guard needed — ADMIN/SUPERADMIN role check is enforced
// in the parent route (admin.tsx), which wraps all child routes via its Outlet.
export const Route = createFileRoute(Routes.ADMIN_DASHBOARD)({
  component: AdminDashboardScreen,
});
