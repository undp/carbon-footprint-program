import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces/routes";
import { ExplanationsMaintainerScreen } from "@/screens/Maintainer/screens/ExplanationsMaintainerScreen";

// Auth + role check inherited from the parent /admin route.
export const Route = createFileRoute(RouteIds.ADMIN_EXPLANATIONS)({
  component: ExplanationsMaintainerScreen,
});
