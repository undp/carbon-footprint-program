import { ToPathOption } from "@tanstack/react-router";

export enum Routes {
  HOME = "/home",
  MY_COMPANY = "/my-company",
  ORGANIZATION_FOOTPRINT = "/organization-footprint",
  REDUCTION_PROJECTS = "/reduction-projects",
  REDUCTION_PLAN = "/reduction-plan",
  AWARDS = "/awards",
  ABOUT_US = "/about",
  TRANSPARENCY = "/transparency",
  CAPINAUT = "/capinaut",
}

export const SidebarRoutes = {
  HOME: Routes.HOME,
  MY_COMPANY: Routes.MY_COMPANY,
  ORGANIZATION_FOOTPRINT: Routes.ORGANIZATION_FOOTPRINT,
  REDUCTION_PROJECTS: Routes.REDUCTION_PROJECTS,
  REDUCTION_PLAN: Routes.REDUCTION_PLAN,
  AWARDS: Routes.AWARDS,
} as const satisfies Record<string, ToPathOption>;

export type SidebarRoute = (typeof SidebarRoutes)[keyof typeof SidebarRoutes];

export const SidebarRoutesTranslations: Record<SidebarRoute, string> = {
  [SidebarRoutes.HOME]: "Inicio",
  [SidebarRoutes.MY_COMPANY]: "Mi empresa",
  [SidebarRoutes.ORGANIZATION_FOOTPRINT]: "Huella organizacional",
  [SidebarRoutes.REDUCTION_PROJECTS]: "Proyectos de reducción",
  [SidebarRoutes.REDUCTION_PLAN]: "Plan de reducción",
  [SidebarRoutes.AWARDS]: "Premios",
};

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
