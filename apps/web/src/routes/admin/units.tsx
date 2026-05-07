import { createFileRoute } from "@tanstack/react-router";
import { MeasurementUnitsScreen } from "@/screens/Maintainer/screens/MeasurementUnitsScreen";

// Role validation is handled by the parent `admin.tsx` route
// (requires ADMIN or SUPERADMIN), so no additional `beforeLoad` is needed here.
export const Route = createFileRoute("/admin/units")({
  component: () => <MeasurementUnitsScreen />,
});
