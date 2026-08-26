import { ToPathOption } from "@tanstack/react-router";
import { Routes } from "./routes.const";

/**
 * Public pages linked from the header navigation, in the order in which they
 * appear.
 *
 * `RESOURCES` and `ACKNOWLEDGEMENTS` are deliberately absent: both screens and
 * their routes still exist and answer on their own URL, they just carry no tab
 * in the RD deployment. Adding the entry back is what puts the tab back.
 */
export const PublicHeaderRoutes: Record<string, ToPathOption> = {
  TRANSPARENCY: Routes.TRANSPARENCY,
  ABOUT_US: Routes.ABOUT_US,
  //TODO: Update when Capinaut page is ready
  // CAPINAUT: Routes.CAPINAUT,
} as const;

type PageRoute = (typeof PublicHeaderRoutes)[keyof typeof PublicHeaderRoutes];

export const PublicHeaderRoutesTranslations: Record<PageRoute, string> = {
  [PublicHeaderRoutes.TRANSPARENCY]: "Transparencia",
  [PublicHeaderRoutes.ABOUT_US]: "Sobre la iniciativa",
  //TODO: Update when Capinaut page is ready
  // [PublicHeaderRoutes.CAPINAUT]: "Capinaut",
};
