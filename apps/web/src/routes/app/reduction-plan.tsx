import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";
import { UnderConstructionScreen } from "@/screens/UnderConstruction";

export const Route = createFileRoute(Routes.REDUCTION_PLAN)({
  component: () => (
    <MainLayout>
      {/* TODO: Replace with real Reduction Plan screen component */}
      <UnderConstructionScreen />
    </MainLayout>
  ),
});
