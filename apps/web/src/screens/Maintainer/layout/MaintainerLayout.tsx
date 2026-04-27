import { Box, Typography } from "@mui/material";
import { FC, PropsWithChildren, useMemo } from "react";
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
  ViewColumnOutlined,
  WorkspacePremiumOutlined,
  RecommendOutlined,
  ListAltOutlined,
  HelpOutlineOutlined,
} from "@mui/icons-material";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces/routes";
import { Sidebar, UserMenu } from "@/components/layout/Sidebar";
import type { SidebarDef } from "@/components/layout/Sidebar";
import { APP_VERSION } from "@/config/environment";
import { capitalize } from "lodash-es";
import { VOCAB } from "@/config/vocab";
import { useMe } from "@/api/query/users/useMe";

const SIDEBAR_DEFS: SidebarDef[] = [
  {
    text: "Dashboard",
    icon: <DashboardOutlined />,
    path: Routes.ADMIN_DASHBOARD,
  },
  {
    text: "Metodologías",
    icon: <MenuBookOutlined />,
    path: Routes.ADMIN_METHODOLOGIES,
    requiredRoles: [SystemRole.SUPERADMIN],
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
        text: "Dimensiones / Variables",
        icon: <ViewColumnOutlined fontSize="small" />,
        path: Routes.ADMIN_DIMENSIONS,
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
    requiredRoles: [SystemRole.SUPERADMIN],
    children: [
      {
        text: "Actividades Principales",
        icon: <CategoryOutlined />,
        path: Routes.ADMIN_MAIN_ACTIVITIES,
      },
    ],
  },
  {
    text: "Recomendaciones de Subcategorías",
    icon: <RecommendOutlined />,
    path: Routes.ADMIN_SUBCATEGORY_RECOMMENDATIONS,
    requiredRoles: [SystemRole.ADMIN, SystemRole.SUPERADMIN],
  },
  {
    text: "Parámetros",
    icon: <TuneOutlined />,
    path: Routes.ADMIN_PARAMETERS,
    requiredRoles: [SystemRole.SUPERADMIN],
  },
  {
    text: capitalize(VOCAB.organization.noun.plural),
    icon: <BusinessOutlined />,
    path: Routes.ADMIN_ORGANIZATIONS,
  },
  {
    text: "Solicitudes",
    icon: <TaskOutlined />,
    path: Routes.ADMIN_REQUESTS,
  },
  {
    text: "Sellos",
    icon: <WorkspacePremiumOutlined />,
    path: Routes.ADMIN_BADGES,
    requiredRoles: [SystemRole.SUPERADMIN],
  },
  {
    text: "Iniciativas de Planes de Reducción",
    icon: <ListAltOutlined />,
    path: Routes.ADMIN_REDUCTION_PLAN_INITIATIVES,
  },
  {
    text: "Explicaciones",
    icon: <HelpOutlineOutlined />,
    path: Routes.ADMIN_EXPLANATIONS,
  },
  {
    text: "Historial de cambios",
    icon: <HistoryOutlined />,
    path: "#",
  },
];

export const MaintainerLayout: FC<PropsWithChildren> = ({ children }) => {
  const { data: me } = useMe(true);
  const userRole = me?.role;

  const visibleItems = useMemo(
    () =>
      SIDEBAR_DEFS.filter(
        (item) =>
          !item.requiredRoles ||
          (userRole && item.requiredRoles.includes(userRole))
      ),
    [userRole]
  );

  return (
    <Box className="min-h-screen" style={{ paddingLeft: SIDEBAR_WIDTH }}>
      <Sidebar
        items={visibleItems}
        footer={
          <>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ mt: "auto", px: 1, textAlign: "center" }}
            >
              {APP_VERSION}
            </Typography>
            <UserMenu />
          </>
        }
      />
      <Box className="flex min-h-screen flex-col gap-3 bg-gray-50 px-6 py-6">
        {children}
      </Box>
    </Box>
  );
};
