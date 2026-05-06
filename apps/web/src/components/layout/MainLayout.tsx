import { FC, PropsWithChildren } from "react";
import { Box } from "@mui/material";
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
import { SIDEBAR_MINI_WIDTH, SIDEBAR_WIDTH } from "@/config/constants";
import { useSidebarStore } from "@/stores/sidebarStore";
import { sidebarTransition } from "@/theme";
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
  const isPinned = useSidebarStore((state) => state.isPinned);

  return (
    <Box
      className="min-h-screen"
      sx={(theme) => ({
        pl: `${isPinned ? SIDEBAR_WIDTH : SIDEBAR_MINI_WIDTH}px`,
        transition: sidebarTransition(theme, "padding-left"),
      })}
    >
      <Sidebar
        items={SIDEBAR_ITEMS}
        onLogoClick={() => navigate({ to: Routes.HOME })}
      />
      <Box className="flex min-h-screen flex-col px-6 py-6">{children}</Box>
    </Box>
  );
};
