import { createFileRoute } from "@tanstack/react-router";
import { MainActivitiesMaintainerScreen } from "@/screens/Maintainer/screens/MainActivitiesMaintainerScreen";

export const Route = createFileRoute("/admin/main-activities")({
  component: () => <MainActivitiesMaintainerScreen />,
});
