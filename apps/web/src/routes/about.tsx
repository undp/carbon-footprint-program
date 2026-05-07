import { createFileRoute } from "@tanstack/react-router";
import { UnderConstructionScreen } from "@/screens/UnderConstruction";

export const Route = createFileRoute("/about")({
  // TODO: Replace with real About screen component
  component: UnderConstructionScreen,
});
