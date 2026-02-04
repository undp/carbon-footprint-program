import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { MaintainerLayout } from "@/screens/Maintainer/layout/MaintainerLayout";

export const Route = createFileRoute(Routes.ADMIN)({
  component: () => (
    <MaintainerLayout>
      <Outlet />
    </MaintainerLayout>
  ),
});
