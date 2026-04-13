import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";

export const Route = createFileRoute(Routes.REDUCTION_PROJECTS)({
  component: () => <Outlet />,
});
