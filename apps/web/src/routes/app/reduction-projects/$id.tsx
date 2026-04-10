import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { ReductionProjectScreen } from "@/screens/ReductionProject";

export const Route = createFileRoute(Routes.REDUCTION_PROJECT)({
  component: function ReductionProjectRoute() {
    const { id } = Route.useParams();
    return <ReductionProjectScreen mode="edit" id={id} />;
  },
});
