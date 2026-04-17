import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/reduction-projects/$id")({
  component: () => <Outlet />,
});
