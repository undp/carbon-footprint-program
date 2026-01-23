import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";

export const Route = createFileRoute("/app/maintainer/")({
  component: () => <Navigate to={Routes.MAINTAINER_METHODOLOGIES} />,
});
