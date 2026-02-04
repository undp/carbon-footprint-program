import { FC } from "react";
import { Drawer, List, Toolbar, Divider } from "@mui/material";
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
} from "@mui/icons-material";
import { Routes } from "@/interfaces/routes";
import { HuellaLatamLogo } from "@icons/HuellaLatamLogo";
import { MaintainerSidebarItem, SidebarItem } from "./MaintainerSidebarItem";
import { MaintainerSidebarGroup } from "./MaintainerSidebarGroup";

interface Props {
  width: number;
}

interface SidebarGroup extends SidebarItem {
  children: SidebarItem[];
}

const SIDEBAR_DEFS: (SidebarItem | SidebarGroup)[] = [
  {
    label: "Dashboard Admin",
    icon: <DashboardOutlined />,
    disabled: true,
  },
  {
    label: "Metodologías",
    icon: <MenuBookOutlined />,
    path: Routes.ADMIN_METHODOLOGIES,
    children: [
      {
        label: "Categorías/Alcances",
        icon: <ScienceOutlined fontSize="small" />,
        path: Routes.ADMIN_SCOPES,
      },
      {
        label: "Sub-categorías",
        icon: <AccountTreeOutlined fontSize="small" />,
        path: Routes.ADMIN_SUBCATEGORIES,
      },
      {
        label: "Factores de emisión",
        icon: <Co2Outlined fontSize="small" />,
        path: Routes.ADMIN_EMISSION_FACTORS,
      },
      {
        label: "Unidades",
        icon: <SquareFootOutlined fontSize="small" />,
        path: Routes.ADMIN_UNITS,
      },
    ],
  },
  {
    label: "Rubros",
    icon: <CategoryOutlined />,
    path: Routes.ADMIN_CATEGORIES,
    children: [
      {
        label: "Actividades Principales",
        icon: <CategoryOutlined />,
        path: Routes.ADMIN_MAIN_ACTIVITIES,
      },
    ],
  },
  {
    label: "Parámetros",
    icon: <TuneOutlined />,
    path: Routes.ADMIN_PARAMETERS,
    disabled: true,
    children: [
      { label: "Alias", icon: <TuneOutlined />, path: "#", disabled: true },
    ],
  },
  {
    label: "Historial de cambios",
    icon: <HistoryOutlined />,
    path: "#",
    disabled: false,
  },
];

export const MaintainerSidebar: FC<Props> = ({ width }) => {
  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          px: 1,
          gap: 1,
        },
      }}
    >
      <Toolbar>
        <HuellaLatamLogo sx={{ width: 93, height: 40 }} />
      </Toolbar>
      <Divider variant="middle" />
      <List sx={{ pt: 1 }}>
        {SIDEBAR_DEFS.map((def) => {
          if (!("children" in def)) {
            return <MaintainerSidebarItem key={def.label} {...def} />;
          }
          return <MaintainerSidebarGroup key={def.label} {...def} />;
        })}
      </List>
    </Drawer>
  );
};
