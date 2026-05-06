import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { HomeScreen } from "@/screens/Home";

export const Route = createFileRoute(Routes.HOME)({
  component: HomeScreen,
});
