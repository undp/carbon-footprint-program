import { FC, useMemo } from "react";
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
import { HuellaLatamLogo } from "@icons/HuellaLatamLogo";
import { Item } from "./Item";
import {
  SidebarRoute,
  SidebarRoutes,
  SidebarRoutesTranslations,
} from "@/interfaces";

const SidebarIcons: Record<SidebarRoute, React.ReactNode> = {
  [SidebarRoutes.HOME]: <HomeOutlined />,
  [SidebarRoutes.MY_COMPANY]: <Business />,
  [SidebarRoutes.ORGANIZATION_FOOTPRINT]: <SouthAmerica />,
  [SidebarRoutes.REDUCTION_PROJECTS]: <TrendingDown />,
  [SidebarRoutes.REDUCTION_PLAN]: <SsidChartRounded />,
  [SidebarRoutes.AWARDS]: <EmojiEventsOutlined />,
};

export const Sidebar: FC = () => {
  const location = useLocation();

  const Items = useMemo(
    () =>
      Object.values(SidebarRoutes).map((route) => ({
        text: SidebarRoutesTranslations[route],
        path: route,
        icon: SidebarIcons[route],
        selected: location.pathname == route,
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
