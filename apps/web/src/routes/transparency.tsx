import { createFileRoute } from "@tanstack/react-router";
import { TransparencyScreen } from "@/screens/Transparency";

export const Route = createFileRoute("/transparency")({
  component: TransparencyScreen,
});
