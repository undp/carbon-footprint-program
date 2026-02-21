import { Box } from "@mui/material";
import { FC, PropsWithChildren } from "react";
import { SIDEBAR_WIDTH } from "@/config/constants";
import {
  DashboardOutlined,
  MenuBookOutlined,
  CategoryOutlined,
  TuneOutlined,
  HistoryOutlined,
  ScienceOutlined,
  AccountTreeOutlined,
  Co2Outlined,
  SquareFootOutlined,
  TaskOutlined,
  BusinessOutlined,
} from "@mui/icons-material";
import { Routes } from "@/interfaces/routes";
import { Sidebar } from "@/components/layout/Sidebar";
import type { SidebarDef } from "@/components/layout/Sidebar";

const SIDEBAR_DEFS: SidebarDef[] = [
  {
    text: "Dashboard",
    icon: <DashboardOutlined />,
    path: "#",
    disabled: true,
  },
  {
    text: "Metodologías",
    icon: <MenuBookOutlined />,
    path: Routes.ADMIN_METHODOLOGIES,
    children: [
      {
        text: "Categorías/Alcances",
        icon: <ScienceOutlined fontSize="small" />,
        path: Routes.ADMIN_CATEGORIES,
      },
      {
        text: "Sub-categorías",
        icon: <AccountTreeOutlined fontSize="small" />,
        path: Routes.ADMIN_SUBCATEGORIES,
      },
      {
        text: "Factores de emisión",
        icon: <Co2Outlined fontSize="small" />,
        path: Routes.ADMIN_EMISSION_FACTORS,
      },
      {
        text: "Unidades",
        icon: <SquareFootOutlined fontSize="small" />,
        path: Routes.ADMIN_UNITS,
      },
    ],
  },
  {
    text: "Rubros",
    icon: <CategoryOutlined />,
    path: Routes.ADMIN_ITEMS,
    children: [
      {
        text: "Actividades Principales",
        icon: <CategoryOutlined />,
        path: Routes.ADMIN_MAIN_ACTIVITIES,
      },
    ],
  },
  {
    text: "Parámetros",
    icon: <TuneOutlined />,
    path: Routes.ADMIN_PARAMETERS,
    disabled: true,
    children: [
      { text: "Alias", icon: <TuneOutlined />, path: "#", disabled: true },
    ],
  },
  {
    text: "Empresas",
    icon: <BusinessOutlined />,
    path: Routes.ADMIN_ORGANIZATIONS,
  },
  {
    text: "Solicitudes",
    icon: <TaskOutlined />,
    path: Routes.ADMIN_REQUESTS,
  },
  {
    text: "Historial de cambios",
    icon: <HistoryOutlined />,
    path: "#",
  },
];

export const MaintainerLayout: FC<PropsWithChildren> = ({ children }) => (
  <Box className="min-h-screen" style={{ paddingLeft: SIDEBAR_WIDTH }}>
    <Sidebar items={SIDEBAR_DEFS} />
    <Box className="flex min-h-screen flex-col gap-3 bg-gray-50 px-6 py-6">
      {children}
    </Box>
  </Box>
);
