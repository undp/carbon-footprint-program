import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";

export const Route = createFileRoute(Routes.CAPINAUT)({
  component: () => (
    /* TODO: Replace with real Capinaut screen component */
    <div>Hello &quot;/capinaut&quot;!</div>
  ),
});
