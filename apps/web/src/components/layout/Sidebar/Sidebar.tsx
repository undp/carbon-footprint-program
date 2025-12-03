import React, { useMemo } from "react";
import { Divider, Drawer, List, Toolbar } from "@mui/material";
import {
  HomeOutlined,
  Business,
  SouthAmerica,
  TrendingDown,
  SsidChartRounded,
  EmojiEventsOutlined,
} from "@mui/icons-material";
import { useLocation } from "@tanstack/react-router";
import { HuellaLatamLogo } from "../../../icons/HuellaLatamLogo";
import { Item } from "./Item";

enum SidebarRoutes {
  HOME = "/home",
  MY_COMPANY = "/my-company",
  ORGANIZATION_FOOTPRINT = "/organization-footprint",
  REDUCTION_PROJECTS = "/reduction-projects",
  REDUCTION_PLAN = "/reduction-plan",
  AWARDS = "/awards",
}

const SidebarRoutesTranslations: Record<SidebarRoutes, string> = {
  [SidebarRoutes.HOME]: "Inicio",
  [SidebarRoutes.MY_COMPANY]: "Mi empresa",
  [SidebarRoutes.ORGANIZATION_FOOTPRINT]: "Huella organizacional",
  [SidebarRoutes.REDUCTION_PROJECTS]: "Proyectos de reducción",
  [SidebarRoutes.REDUCTION_PLAN]: "Plan de reducción",
  [SidebarRoutes.AWARDS]: "Premios",
};

const SidebarIcons: Record<SidebarRoutes, React.ReactNode> = {
  [SidebarRoutes.HOME]: <HomeOutlined />,
  [SidebarRoutes.MY_COMPANY]: <Business />,
  [SidebarRoutes.ORGANIZATION_FOOTPRINT]: <SouthAmerica />,
  [SidebarRoutes.REDUCTION_PROJECTS]: <TrendingDown />,
  [SidebarRoutes.REDUCTION_PLAN]: <SsidChartRounded />,
  [SidebarRoutes.AWARDS]: <EmojiEventsOutlined />,
};

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const Items = useMemo(
    () =>
      Object.values(SidebarRoutes).map((route) => ({
        text: SidebarRoutesTranslations[route],
        path: route,
        icon: SidebarIcons[route],
        selected: location.pathname == (route as string),
      })),
    [location.pathname]
  );

  return (
    <Drawer
      sx={{
        display: "flex",
        alignItems: "flex-start",
        width: 268,
        flexShrink: 0,
        px: 1,
        "& .MuiDrawer-paper": {
          width: 268,
          gap: 2,
          px: 1,
        },
      }}
      variant="permanent"
      anchor="left"
    >
      <Toolbar>
        <HuellaLatamLogo
          sx={{
            width: 93,
            height: 40,
          }}
        />
      </Toolbar>
      <Divider variant="middle" />
      <List sx={{ pt: 0 }}>
        {Items.map(({ text, path, icon, selected }) => (
          <Item
            key={text}
            text={text}
            path={path}
            icon={icon}
            selected={selected}
          />
        ))}
      </List>
    </Drawer>
  );
};
