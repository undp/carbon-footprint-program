import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/carbon-inventory")({
  component: () => <Outlet />,
});
