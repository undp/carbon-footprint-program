import { ToPathOption } from "@tanstack/react-router";
import { Routes } from "./routes.const";

/**
 * Páginas públicas enlazadas desde la navegación del header, en el orden en
 * que aparecen.
 */
export const PublicHeaderRoutes: Record<string, ToPathOption> = {
  TRANSPARENCY: Routes.TRANSPARENCY,
  ABOUT_US: Routes.ABOUT_US,
  RESOURCES: Routes.RESOURCES,
  ACKNOWLEDGEMENTS: Routes.ACKNOWLEDGEMENTS,
  //TODO: Update when Capinaut page is ready
  // CAPINAUT: Routes.CAPINAUT,
} as const;

type PageRoute = (typeof PublicHeaderRoutes)[keyof typeof PublicHeaderRoutes];

export const PublicHeaderRoutesTranslations: Record<PageRoute, string> = {
  [PublicHeaderRoutes.TRANSPARENCY]: "Transparencia",
  [PublicHeaderRoutes.ABOUT_US]: "Sobre la iniciativa",
  [PublicHeaderRoutes.RESOURCES]: "Material complementario",
  [PublicHeaderRoutes.ACKNOWLEDGEMENTS]: "Agradecimientos",
  //TODO: Update when Capinaut page is ready
  // [PublicHeaderRoutes.CAPINAUT]: "Capinaut",
};
