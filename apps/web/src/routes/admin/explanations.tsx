import { createFileRoute } from "@tanstack/react-router";
import { ExplanationsMaintainerScreen } from "@/screens/Maintainer/screens/ExplanationsMaintainerScreen";

// Auth + role check inherited from the parent /admin route.
export const Route = createFileRoute("/admin/explanations")({
  component: ExplanationsMaintainerScreen,
});
