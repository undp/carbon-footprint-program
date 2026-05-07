import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces/routes";
import { TransparencyScreen } from "@/screens/Transparency";

export const Route = createFileRoute(RouteIds.TRANSPARENCY)({
  component: TransparencyScreen,
});
