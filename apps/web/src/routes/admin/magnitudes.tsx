import { createFileRoute } from "@tanstack/react-router";
import { MagnitudesScreen } from "@/screens/Maintainer/screens/MagnitudesScreen";

// Role validation is handled by the parent `admin.tsx` route
// (requires ADMIN or SUPERADMIN), so no additional `beforeLoad` is needed here.
export const Route = createFileRoute("/admin/magnitudes")({
  component: () => <MagnitudesScreen />,
});
