import { createFileRoute } from "@tanstack/react-router";
import { SectorsMaintainerScreen } from "@/screens/Maintainer/screens/SectorsMaintainerScreen";

export const Route = createFileRoute("/admin/sectors")({
  component: () => <SectorsMaintainerScreen />,
});
