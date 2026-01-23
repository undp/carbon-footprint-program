import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { MethodologiesScreen } from "@/screens/Maintainer/screens/MethodologiesScreen";

export const Route = createFileRoute(Routes.MAINTAINER_METHODOLOGIES)({
  component: () => <MethodologiesScreen />,
});
