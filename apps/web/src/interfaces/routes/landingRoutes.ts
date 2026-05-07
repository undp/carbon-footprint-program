import { ToPathOption } from "@tanstack/react-router";
import { Routes } from "./routes.const";

export const LandingHeaderRoutes: Record<string, ToPathOption> = {
  TRANSPARENCY: Routes.TRANSPARENCY,
  //TODO: Update when Capinaut page is ready
  // CAPINAUT: Routes.CAPINAUT,
} as const;

type PageRoute = (typeof LandingHeaderRoutes)[keyof typeof LandingHeaderRoutes];

export const LandingHeaderRoutesTranslations: Record<PageRoute, string> = {
  [LandingHeaderRoutes.TRANSPARENCY]: "Transparencia",
  //TODO: Update when Capinaut page is ready
  // [LandingHeaderRoutes.CAPINAUT]: "Capinaut",
};
