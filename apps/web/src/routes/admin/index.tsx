import { createFileRoute, Navigate } from "@tanstack/react-router";
import { RouteIds, Routes } from "@/interfaces";

// No beforeLoad guard needed
// only redirecting to another admin route,
// which is protected by the parent route's role check.
export const Route = createFileRoute(RouteIds.ADMIN_INDEX)({
  component: () => <Navigate to={Routes.ADMIN_DASHBOARD} />,
});
