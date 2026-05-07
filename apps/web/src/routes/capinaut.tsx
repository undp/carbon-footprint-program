import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces/routes";
import { UnderConstructionScreen } from "@/screens/UnderConstruction";

export const Route = createFileRoute(RouteIds.CAPINAUT)({
  // TODO: Replace with real Capinaut screen component
  component: UnderConstructionScreen,
});
