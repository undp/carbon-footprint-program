import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { AdminDashboardScreen } from "@/screens/Maintainer/screens/AdminDashboardScreen";
import { MainLayout } from "@/components";

// No beforeLoad guard needed — ADMIN/SUPERADMIN role check is enforced
// in the parent route (admin.tsx), which wraps all child routes via its Outlet.
export const Route = createFileRoute(Routes.ADMIN_DASHBOARD)({
  validateSearch: (search: Record<string, unknown>) => {
    const currentYear = new Date().getFullYear();
    const year = search.year;
    if (year === undefined) return {};
    const parsed = Number(year);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > currentYear)
      return {};
    return { year: parsed };
  },
  component: () => (
    <MainLayout>
      <AdminDashboardScreen />
    </MainLayout>
  ),
});
