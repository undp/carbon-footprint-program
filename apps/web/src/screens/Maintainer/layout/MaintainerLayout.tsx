import { Box, Typography } from "@mui/material";
import { FC, PropsWithChildren, useMemo } from "react";
import { SIDEBAR_WIDTH } from "@/config/constants";
import {
  DashboardOutlined,
  MenuBookOutlined,
  TuneOutlined,
  HistoryOutlined,
  ScienceOutlined,
  AccountTreeOutlined,
  Co2Outlined,
  SquareFootOutlined,
  TaskOutlined,
  BusinessOutlined,
  BusinessCenterOutlined,
  ViewColumnOutlined,
  WorkspacePremiumOutlined,
  RecommendOutlined,
  ListAltOutlined,
  InfoOutlined,
  AutoAwesomeMotionOutlined,
  StraightenOutlined,
  PeopleOutlined,
} from "@mui/icons-material";
import FactoryOutlinedIcon from "@mui/icons-material/FactoryOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces/routes";
import { Sidebar } from "@/components/layout/Sidebar";
import type { SidebarDef } from "@/components/layout/Sidebar";
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
    requiredRoles: [SystemRole.SUPERADMIN],
    children: [
      {
        text: "Versiones",
        icon: <AutoAwesomeMotionOutlined fontSize="small" />,
        path: Routes.ADMIN_METHODOLOGIES,
      },
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
    ],
  },
  {
    text: "Unidades",
    icon: <SquareFootOutlined fontSize="small" />,
    path: Routes.ADMIN_UNITS,
  },
  {
    text: "Perfilamiento",
    icon: <BusinessCenterOutlined />,
    children: [
      {
        text: "Rubros",
        icon: <FactoryOutlinedIcon fontSize="small" />,
        path: Routes.ADMIN_SECTORS,
      },
      {
        text: "Subrubros",
        icon: <PrecisionManufacturingOutlinedIcon fontSize="small" />,
        path: Routes.ADMIN_SUBSECTORS,
      },
      {
        text: "Actividades Principales",
        icon: <EngineeringOutlinedIcon fontSize="small" />,
        path: Routes.ADMIN_MAIN_ACTIVITIES,
      },
      {
        text: `Tamaño ${capitalize(VOCAB.organization.noun.singular)}`,
        icon: <StraightenOutlined fontSize="small" />,
        path: Routes.ADMIN_ORGANIZATION_SIZES,
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
    text: "Usuarios",
    icon: <PeopleOutlined />,
    path: Routes.ADMIN_USERS,
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
    icon: <InfoOutlined />,
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
      <Sidebar items={visibleItems} areaLabel="Admin" areaVariant="admin" />
      <Box className="flex min-h-screen flex-col gap-3 bg-gray-50 px-6 py-6">
        {children}
      </Box>
    </Box>
  );
};
