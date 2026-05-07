import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/_fullscreen/reduction-projects/$id")(
  {
    component: () => <Outlet />,
  }
);
