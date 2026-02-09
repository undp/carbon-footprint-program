import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { UnderConstructionScreen } from "@/screens/UnderConstruction";

export const Route = createFileRoute(Routes.ABOUT_US)({
  // TODO: Replace with real About screen component
  component: UnderConstructionScreen,
});
