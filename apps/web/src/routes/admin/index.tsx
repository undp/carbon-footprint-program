import { createFileRoute } from "@tanstack/react-router";
import { UnderConstructionScreen } from "@/screens/Maintainer/screens/UnderConstructionScreen";
import { Routes } from "@/interfaces/routes";

// No beforeLoad guard needed — ADMIN/SUPERADMIN role check is enforced
// in the parent route (admin.tsx), which wraps all child routes via its Outlet.
export const Route = createFileRoute(Routes.ADMIN)({
  component: () => <UnderConstructionScreen />,
});
