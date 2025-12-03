import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@components/layout";

export const Route = createFileRoute("/home")({
  component: () => (
    <MainLayout>
      <div>Hello home!</div>
    </MainLayout>
  ),
});
