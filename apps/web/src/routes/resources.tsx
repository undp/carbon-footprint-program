import { createFileRoute } from "@tanstack/react-router";
import { ResourcesScreen } from "@/screens/Resources";

export const Route = createFileRoute("/resources")({
  component: ResourcesScreen,
});
