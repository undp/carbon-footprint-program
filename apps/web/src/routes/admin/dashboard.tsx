import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { RouteIds } from "@/interfaces";
import { AdminDashboardScreen } from "@/screens/AdminDashboard/AdminDashboardScreen";

const dashboardSearchSchema = z.object({
  year: z.coerce
    .number()
    .int()
    .positive()
    .refine((y) => y <= new Date().getFullYear(), {
      message: "Year cannot be in the future",
    })
    .optional()
    .catch(undefined),
});

// No beforeLoad guard needed — ADMIN/SUPERADMIN role check is enforced
// in the parent route (admin.tsx), which wraps all child routes via its Outlet.
export const Route = createFileRoute(RouteIds.ADMIN_DASHBOARD)({
  validateSearch: dashboardSearchSchema,
  component: AdminDashboardScreen,
});
