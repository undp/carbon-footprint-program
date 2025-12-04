import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";

export const Route = createFileRoute("/my-company")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MainLayout>Hello &quot;/my-company&quot;!</MainLayout>;
}
