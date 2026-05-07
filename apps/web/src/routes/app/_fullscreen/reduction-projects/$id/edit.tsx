import { createFileRoute } from "@tanstack/react-router";
import { ReductionProjectScreen } from "@/screens/ReductionProject";

export const Route = createFileRoute(
  "/app/_fullscreen/reduction-projects/$id/edit"
)({
  component: () => <ReductionProjectScreen mode="edit" />,
});
