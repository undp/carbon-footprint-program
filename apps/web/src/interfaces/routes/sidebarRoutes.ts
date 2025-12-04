import { ToPathOption } from "@tanstack/react-router";
import { Routes } from "./routes.enum";

export const SidebarRoutes: Record<string, ToPathOption> = {
  HOME: Routes.HOME,
  MY_ORGANIZATION: Routes.MY_ORGANIZATION,
  CARBON_FOOTPRINT: Routes.CARBON_FOOTPRINT,
  REDUCTION_PROJECTS: Routes.REDUCTION_PROJECTS,
  REDUCTION_PLAN: Routes.REDUCTION_PLAN,
  AWARDS: Routes.AWARDS,
} as const;

export type SidebarRoute = (typeof SidebarRoutes)[keyof typeof SidebarRoutes];

export const SidebarRoutesTranslations: Record<SidebarRoute, string> = {
  [SidebarRoutes.HOME]: "Inicio",
  [SidebarRoutes.MY_ORGANIZATION]: "Mi empresa",
  [SidebarRoutes.CARBON_FOOTPRINT]: "Huella organizacional",
  [SidebarRoutes.REDUCTION_PROJECTS]: "Proyectos de reducción",
  [SidebarRoutes.REDUCTION_PLAN]: "Plan de reducción",
  [SidebarRoutes.AWARDS]: "Premios",
};
