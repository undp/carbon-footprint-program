import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { UnderConstructionScreen } from "../screens/UnderConstruction";

export const Route = createFileRoute(Routes.TRANSPARENCY)({
  // TODO: Replace with real Transparency screen component
  component: UnderConstructionScreen,
});
