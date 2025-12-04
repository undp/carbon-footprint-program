import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";

export const Route = createFileRoute(Routes.TRANSPARENCY)({
  component: () => (
    /* TODO: Replace with real Transparency screen component */
    <div>Hello &quot;/transparency&quot;!</div>
  ),
});
