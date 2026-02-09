import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";
import { UnderConstructionScreen } from "../../screens/UnderConstruction";

export const Route = createFileRoute(Routes.REDUCTION_PROJECTS)({
  component: () => (
    <MainLayout>
      {/* // TODO: Replace with real Reduction Projects screen component */}
      <UnderConstructionScreen />
    </MainLayout>
  ),
});
