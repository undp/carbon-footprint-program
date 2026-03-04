import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { HomeScreen } from "@/screens/Home";
import { MainLayout } from "@/components";

export const Route = createFileRoute(Routes.HOME)({
  component: () => (
    <MainLayout>
      <HomeScreen />
    </MainLayout>
  ),
});
