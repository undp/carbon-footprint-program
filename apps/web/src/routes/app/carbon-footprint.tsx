import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";

export const Route = createFileRoute(Routes.CARBON_FOOTPRINT)({
  component: () => (
    <MainLayout>
      {/* TODO: Replace with real Organization Footprint screen component */}
      <div>Hello &quot;/carbon-footprint&quot;!</div>
    </MainLayout>
  ),
});
