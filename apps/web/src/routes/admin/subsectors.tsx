import { createFileRoute } from "@tanstack/react-router";
import { SubsectorsMaintainerScreen } from "@/screens/Maintainer/screens/SubsectorsMaintainerScreen";

export const Route = createFileRoute("/admin/subsectors")({
  component: () => <SubsectorsMaintainerScreen />,
});
