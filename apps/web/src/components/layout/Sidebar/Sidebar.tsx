import { FC, useMemo } from "react";
import { Divider, Drawer, List, Toolbar, Typography } from "@mui/material";
import {
  HomeOutlined,
  Business,
  SouthAmerica,
  TrendingDown,
  SsidChartRounded,
  EmojiEventsOutlined,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { HuellaLatamLogo } from "@icons/HuellaLatamLogo";
import { Item } from "./Item";
import {
  Routes,
  SidebarRoute,
  SidebarRoutes,
  SidebarRoutesTranslations,
} from "@/interfaces";
import { UserMenu } from "./UserMenu";
import { SIDEBAR_WIDTH } from "@/config/constants";
import { APP_VERSION } from "@/config/environment";

const SidebarIcons: Record<SidebarRoute, React.ReactNode> = {
  [SidebarRoutes.HOME]: <HomeOutlined />,
  [SidebarRoutes.MY_ORGANIZATION]: <Business />,
  [SidebarRoutes.CARBON_INVENTORIES]: <SouthAmerica />,
  [SidebarRoutes.REDUCTION_PROJECTS]: <TrendingDown />,
  [SidebarRoutes.REDUCTION_PLAN]: <SsidChartRounded />,
  [SidebarRoutes.AWARDS]: <EmojiEventsOutlined />,
};

export const Sidebar: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const items = useMemo(
    () =>
      Object.values(SidebarRoutes).map((path) => ({
        text: SidebarRoutesTranslations[path],
        path: path,
        icon: SidebarIcons[path],
        selected: location.pathname == path,
      })),
    [location.pathname]
  );

  return (
    <Drawer
      sx={{
        display: "flex",
        alignItems: "flex-start",
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        flexGrow: 1,
        px: 1,
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
          gap: 2,
          px: 2,
        },
      }}
      variant="permanent"
      anchor="left"
    >
      <Toolbar sx={{ px: "8px", py: "16px" }} disableGutters>
        <HuellaLatamLogo
          sx={{
            width: 116,
            height: 50,
            cursor: "pointer",
          }}
          onClick={() => navigate({ to: Routes.HOME })}
        />
      </Toolbar>
      <Divider />

      <List sx={{ pt: 0 }}>
        {items.map(({ text, path, icon, selected }) => (
          <Item
            key={path}
            text={text}
            path={path}
            icon={icon}
            selected={selected}
          />
        ))}
      </List>

      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ mt: "auto", px: 1, textAlign: "center" }}
      >
        {APP_VERSION}
      </Typography>

      <UserMenu />
    </Drawer>
  );
};
