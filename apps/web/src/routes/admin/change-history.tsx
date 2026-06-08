import { createFileRoute } from "@tanstack/react-router";
import { UnderConstructionScreen } from "@/screens/Maintainer/screens/UnderConstructionScreen";

export const Route = createFileRoute("/admin/change-history")({
  component: () => <UnderConstructionScreen />,
});
