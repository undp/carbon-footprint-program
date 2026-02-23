import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";
import { UnderConstructionScreen } from "@/screens/UnderConstruction";

export const Route = createFileRoute(Routes.MY_ORGANIZATION)({
  component: () => (
    <MainLayout>
      {/* TODO: Replace with real My Organization screen component */}
      <UnderConstructionScreen />
    </MainLayout>
  ),
});
