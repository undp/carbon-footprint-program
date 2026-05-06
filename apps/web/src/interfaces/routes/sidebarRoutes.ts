import { ToPathOption } from "@tanstack/react-router";
import { Routes } from "./routes.const";
import { VOCAB } from "@/config/vocab";

export const SidebarRoutes: Record<string, ToPathOption> = {
  HOME: Routes.HOME,
  MY_ORGANIZATION: Routes.MY_ORGANIZATION,
  CARBON_INVENTORIES: Routes.CARBON_INVENTORIES,
  REDUCTION_PROJECTS: Routes.REDUCTION_PROJECTS,
  REDUCTION_PLAN: Routes.REDUCTION_PLAN,
  RECOGNITIONS: Routes.RECOGNITIONS,
} as const;

export type SidebarRoute = (typeof SidebarRoutes)[keyof typeof SidebarRoutes];

export const SidebarRoutesTranslations: Record<SidebarRoute, string> = {
  [SidebarRoutes.HOME]: "Inicio",
  [SidebarRoutes.MY_ORGANIZATION]: `Mi ${VOCAB.organization.noun.singular}`,
  [SidebarRoutes.CARBON_INVENTORIES]: `Huella ${VOCAB.organization.relationalAdjective}`,
  [SidebarRoutes.REDUCTION_PROJECTS]: "Proyectos de reducción",
  [SidebarRoutes.REDUCTION_PLAN]: "Plan de reducción",
  [SidebarRoutes.RECOGNITIONS]: "Reconocimientos",
};
