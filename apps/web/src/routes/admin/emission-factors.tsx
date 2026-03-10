import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { EmissionFactorsMaintainerScreen } from "@/screens/Maintainer/screens/EmissionFactorsMaintainerScreen";

export const Route = createFileRoute(Routes.ADMIN_EMISSION_FACTORS)({
  component: () => <EmissionFactorsMaintainerScreen />,
});
