import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";

export const Route = createFileRoute("/about")({
  component: () => <MainLayout>Hello &quot;/about&quot;!</MainLayout>,
});
