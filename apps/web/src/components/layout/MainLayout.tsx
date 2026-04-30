import { FC, PropsWithChildren } from "react";
import { Box, Typography } from "@mui/material";
import {
  HomeOutlined,
  Business,
  SouthAmerica,
  TrendingDown,
  SsidChartRounded,
  EmojiEventsOutlined,
} from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar/Sidebar";
import type { SidebarDef } from "./Sidebar/Sidebar";
import { UserMenu } from "./Sidebar/UserMenu";
import { SIDEBAR_WIDTH } from "@/config/constants";
import { APP_VERSION } from "@/config/environment";
import {
  Routes,
  SidebarRoute,
  SidebarRoutes,
  SidebarRoutesTranslations,
} from "@/interfaces";

const SidebarIcons: Record<SidebarRoute, React.ReactNode> = {
  [SidebarRoutes.HOME]: <HomeOutlined />,
  [SidebarRoutes.MY_ORGANIZATION]: <Business />,
  [SidebarRoutes.CARBON_INVENTORIES]: <SouthAmerica />,
  [SidebarRoutes.REDUCTION_PROJECTS]: <TrendingDown />,
  [SidebarRoutes.REDUCTION_PLAN]: <SsidChartRounded />,
  [SidebarRoutes.RECOGNITIONS]: <EmojiEventsOutlined />,
};

const SIDEBAR_ITEMS: SidebarDef[] = Object.values(SidebarRoutes).map(
  (path) => ({
    text: SidebarRoutesTranslations[path],
    path: path,
    icon: SidebarIcons[path],
  })
);

export const MainLayout: FC<PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();

  return (
    <Box className="flex h-screen flex-1">
      <Box sx={{ width: SIDEBAR_WIDTH }}>
        <Sidebar
          items={SIDEBAR_ITEMS}
          onLogoClick={() => navigate({ to: Routes.HOME })}
          areaLabel="App"
          areaVariant="default"
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
      </Box>
      <Box className="flex min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {children}
      </Box>
    </Box>
  );
};
