import { createFileRoute } from "@tanstack/react-router";
import { LandingScreen } from "@screens";
import { RouteIds } from "@/interfaces/routes";

export const Route = createFileRoute(RouteIds.LANDING)({
  component: LandingScreen,
});
