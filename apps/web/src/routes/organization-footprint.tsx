import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";

export const Route = createFileRoute("/organization-footprint")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MainLayout>Hello &quot;/organization-footprint&quot;!</MainLayout>;
}
