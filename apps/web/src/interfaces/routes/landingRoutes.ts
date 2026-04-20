import { ToPathOption } from "@tanstack/react-router";
import { Routes } from "./routes.const";

export const LandingHeaderRoutes: Record<string, ToPathOption> = {
  ABOUT_US: Routes.ABOUT_US,
  TRANSPARENCY: Routes.TRANSPARENCY,
  CAPINAUT: Routes.CAPINAUT,
} as const;

type PageRoute = (typeof LandingHeaderRoutes)[keyof typeof LandingHeaderRoutes];

export const LandingHeaderRoutesTranslations: Record<PageRoute, string> = {
  [LandingHeaderRoutes.ABOUT_US]: "Sobre Huella Latam",
  [LandingHeaderRoutes.TRANSPARENCY]: "Transparencia",
  //TODO: Update when Capinaut page is ready
  // [LandingHeaderRoutes.CAPINAUT]: "Capinaut",
};
