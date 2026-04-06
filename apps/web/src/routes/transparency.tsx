import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { TransparencyScreen } from "@/screens/Transparency";

export const Route = createFileRoute(Routes.TRANSPARENCY)({
  component: TransparencyScreen,
});
