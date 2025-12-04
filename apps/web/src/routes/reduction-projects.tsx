import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";

export const Route = createFileRoute("/reduction-projects")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MainLayout>Hello &quot;/reduction-projects&quot;!</MainLayout>;
}
