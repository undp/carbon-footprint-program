import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces/routes";
import { UnderConstructionScreen } from "@/screens/UnderConstruction";

export const Route = createFileRoute(RouteIds.ABOUT_US)({
  // TODO: Replace with real About screen component
  component: UnderConstructionScreen,
});
