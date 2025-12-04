import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";

export const Route = createFileRoute(Routes.AWARDS)({
  component: () => (
    <MainLayout>
      {/* TODO: Replace with real Awards screen component */}
      <div>Hello &quot;/awards&quot;!</div>
    </MainLayout>
  ),
});
