import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/_shell/reduction-projects")({
  component: () => <Outlet />,
});
