import { Routes } from ".";
import { ToPathOption } from "@tanstack/react-router";

export const LandingHeaderRoutes: Record<string, ToPathOption> = {
  ABOUT_US: Routes.ABOUT_US,
  TRANSPARENCY: Routes.TRANSPARENCY,
  CAPINAUT: Routes.CAPINAUT,
} as const;

type PageRoute = (typeof LandingHeaderRoutes)[keyof typeof LandingHeaderRoutes];

export const LandingHeaderRoutesTranslations: Record<PageRoute, string> = {
  [LandingHeaderRoutes.ABOUT_US]: "Sobre Huella Latam",
  [LandingHeaderRoutes.TRANSPARENCY]: "Transparencia",
  [LandingHeaderRoutes.CAPINAUT]: "Capinauta",
};
