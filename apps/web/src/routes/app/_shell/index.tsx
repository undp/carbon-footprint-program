import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";

// No beforeLoad guard needed
// only redirecting to another app route,
// which is protected by the parent route's role check.
export const Route = createFileRoute("/app/_shell/")({
  component: () => <Navigate to={Routes.HOME} />,
});
