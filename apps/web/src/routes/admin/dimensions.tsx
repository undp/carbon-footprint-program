import { createFileRoute } from "@tanstack/react-router";
import { DimensionsMaintainerScreen } from "@/screens/Maintainer/screens/DimensionsMaintainerScreen";

export const Route = createFileRoute("/admin/dimensions")({
  component: DimensionsMaintainerScreen,
});
