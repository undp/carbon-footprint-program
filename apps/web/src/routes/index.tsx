import { createFileRoute } from "@tanstack/react-router";
import { LandingScreen } from "@screens";
import { RouteIds } from "@/interfaces";

export const Route = createFileRoute(RouteIds.LANDING)({
  component: LandingScreen,
});
