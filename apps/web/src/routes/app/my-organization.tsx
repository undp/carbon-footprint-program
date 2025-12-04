import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";

export const Route = createFileRoute(Routes.MY_ORGANIZATION)({
  component: () => (
    <MainLayout>
      {/* TODO: Replace with real MyCompany screen component */}
      <div>Hello &quot;/my-organization&quot;!</div>
    </MainLayout>
  ),
});
