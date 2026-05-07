import { createFileRoute } from "@tanstack/react-router";
import { UnderConstructionScreen } from "@/screens/UnderConstruction";

export const Route = createFileRoute("/capinaut")({
  // TODO: Replace with real Capinaut screen component
  component: UnderConstructionScreen,
});
