import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { MethodologiesMaintainerScreen } from "@/screens/Maintainer/screens/MethodologiesMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_METHODOLOGIES)({
  component: () => <MethodologiesMaintainerScreen />,
});
