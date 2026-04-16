import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Routes } from "@/interfaces";
import { AdminDashboardScreen } from "@/screens/Maintainer/screens/AdminDashboardScreen";
import { MainLayout } from "@/components";

const currentYear = new Date().getFullYear();

const dashboardSearchSchema = z.object({
  year: z.coerce
    .number()
    .int()
    .positive()
    .max(currentYear)
    .optional()
    .catch(undefined),
});

// No beforeLoad guard needed — ADMIN/SUPERADMIN role check is enforced
// in the parent route (admin.tsx), which wraps all child routes via its Outlet.
export const Route = createFileRoute(Routes.ADMIN_DASHBOARD)({
  validateSearch: dashboardSearchSchema,
  component: () => (
    <MainLayout>
      <AdminDashboardScreen />
    </MainLayout>
  ),
});
