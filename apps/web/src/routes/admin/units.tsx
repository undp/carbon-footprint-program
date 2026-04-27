import { createFileRoute } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { MeasurementUnitsScreen } from "@/screens/Maintainer/screens/MeasurementUnitsScreen";

export const Route = createFileRoute(Routes.ADMIN_UNITS)({
  beforeLoad: requireRole([SystemRole.SUPERADMIN, SystemRole.ADMIN], {
    redirectTo: Routes.ADMIN_DASHBOARD,
  }),
  component: () => <MeasurementUnitsScreen />,
});
