import { createFileRoute } from "@tanstack/react-router";
import { LandingScreen } from "@screens";

export const Route = createFileRoute("/")({
  component: LandingScreen,
});
