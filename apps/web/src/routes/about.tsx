import { createFileRoute } from "@tanstack/react-router";
import { AboutScreen } from "@/screens/About";

export const Route = createFileRoute("/about")({
  component: AboutScreen,
});
