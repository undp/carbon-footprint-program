import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { ExplanationsMaintainerScreen } from "@/screens/Maintainer/screens/ExplanationsMaintainerScreen";

// Auth + role check inherited from the parent /admin route.
export const Route = createFileRoute(Routes.ADMIN_EXPLANATIONS)({
  component: ExplanationsMaintainerScreen,
});
