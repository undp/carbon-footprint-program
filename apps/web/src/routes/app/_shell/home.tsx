import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces";
import { HomeScreen } from "@/screens/Home";

export const Route = createFileRoute(RouteIds.HOME)({
  component: HomeScreen,
});
