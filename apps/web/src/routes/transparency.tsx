import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";

export const Route = createFileRoute("/transparency")({
  component: () => <MainLayout>Hello &quot;/transparency&quot;!</MainLayout>,
});
