import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";
import { UnderConstructionScreen } from "../../screens/UnderConstruction";

export const Route = createFileRoute(Routes.AWARDS)({
  component: () => (
    <MainLayout>
      {/* TODO: Replace with real Awards screen component */}
      <UnderConstructionScreen />
    </MainLayout>
  ),
});
