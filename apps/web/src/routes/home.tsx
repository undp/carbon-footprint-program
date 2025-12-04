import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";

export const Route = createFileRoute("/home")({
  component: () => <MainLayout>Hello &quot;/home&quot;!</MainLayout>,
});
