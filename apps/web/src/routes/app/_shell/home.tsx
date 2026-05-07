import { createFileRoute } from "@tanstack/react-router";
import { HomeScreen } from "@/screens/Home";

export const Route = createFileRoute("/app/_shell/home")({
  component: HomeScreen,
});
