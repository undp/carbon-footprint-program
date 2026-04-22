import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { BadgesScreen } from "@/screens/Maintainer/screens/Badges/BadgesScreen";

export const Route = createFileRoute(Routes.ADMIN_BADGES)({
  component: BadgesScreen,
});
