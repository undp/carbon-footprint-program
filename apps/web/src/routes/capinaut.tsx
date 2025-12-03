import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@components/layout";

export const Route = createFileRoute("/capinaut")({
  component: () => (
    <MainLayout>
      <div>Hello /capinaut!</div>
    </MainLayout>
  ),
});
