import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";
import { AwardsScreen } from "@/screens/Awards/AwardsScreen";

export const Route = createFileRoute(Routes.AWARDS)({
  component: () => (
    <MainLayout>
      <AwardsScreen />
    </MainLayout>
  ),
});
