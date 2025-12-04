import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";

export const Route = createFileRoute("/awards")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <MainLayout>
      <div>Hello &quot;/awards&quot;!</div>
    </MainLayout>
  );
}
