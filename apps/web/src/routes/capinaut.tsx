import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { UnderConstructionScreen } from "../screens/UnderConstruction";

export const Route = createFileRoute(Routes.CAPINAUT)({
  // TODO: Replace with real Capinaut screen component
  component: UnderConstructionScreen,
});
