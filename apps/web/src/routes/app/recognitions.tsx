import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";
import { RecognitionsScreen } from "@/screens/Recognitions/RecognitionsScreen";

export const Route = createFileRoute(Routes.RECOGNITIONS)({
  component: () => (
    <MainLayout>
      <RecognitionsScreen />
    </MainLayout>
  ),
});
