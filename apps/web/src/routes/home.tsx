import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";

export const Route = createFileRoute(Routes.HOME)({
  component: () => (
    <MainLayout>
      {/* TODO: Replace with real Home screen component */}
      <div>Hello &quot;/home&quot;!</div>
    </MainLayout>
  ),
});
