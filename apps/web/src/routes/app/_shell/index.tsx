import { createFileRoute, Navigate } from "@tanstack/react-router";
import { RouteIds, Routes } from "@/interfaces";

// No beforeLoad guard needed
// only redirecting to another app route,
// which is protected by the parent route's role check.
export const Route = createFileRoute(RouteIds.APP_SHELL_INDEX)({
  component: () => <Navigate to={Routes.HOME} />,
});
