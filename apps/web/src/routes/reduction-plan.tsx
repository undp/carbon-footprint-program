import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";

export const Route = createFileRoute("/reduction-plan")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MainLayout>Hello &quot;/reduction-plan&quot;!</MainLayout>;
}
