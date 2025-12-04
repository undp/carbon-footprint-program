import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";

export const Route = createFileRoute(Routes.ABOUT_US)({
  component: () => (
    /* TODO: Replace with real About screen component */
    <div>Hello &quot;/about&quot;!</div>
  ),
});
