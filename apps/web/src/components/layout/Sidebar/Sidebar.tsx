import { FC } from "react";
import { Box, Divider, Drawer, List } from "@mui/material";
import { useLocation } from "@tanstack/react-router";
import { Item } from "./Item";
import { Group } from "./Group";
import type { SidebarGroupItem } from "./Group";
import { SIDEBAR_MINI_WIDTH, SIDEBAR_WIDTH } from "@/config/constants";
import { UserMenu } from "./UserMenu";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarVersion } from "./SidebarVersion";
import { useSidebarState } from "@/hooks";
import { sidebarTransition } from "@/theme";

export interface SidebarDef extends SidebarGroupItem {
  children?: SidebarGroupItem[];
}

interface Props {
  items: SidebarDef[];
  onLogoClick?: () => void;
  areaLabel?: string;
  areaVariant?: "default" | "admin";
}

export const Sidebar: FC<Props> = ({
  items,
  onLogoClick,
  areaLabel,
  areaVariant = "default",
}) => {
  const location = useLocation();

  const {
    isExpanded,
    isPinned,
    togglePin,
    requestExpand,
    handleMouseEnter,
    handleMouseLeave,
  } = useSidebarState();

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={(theme) => ({
        width: SIDEBAR_MINI_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: isExpanded ? SIDEBAR_WIDTH : SIDEBAR_MINI_WIDTH,
          overflowX: "hidden",
          transition: sidebarTransition(theme, "width"),
        },
      })}
      PaperProps={{
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      }}
    >
      <SidebarHeader
        isExpanded={isExpanded}
        isPinned={isPinned}
        onTogglePin={togglePin}
        onLogoClick={onLogoClick}
        areaLabel={areaLabel}
        areaVariant={areaVariant}
      />
      <Divider />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflowY: isExpanded ? "auto" : "hidden",
          overflowX: "hidden",
          px: 1,
          pt: 1,
        }}
      >
        <List>
          {items.map((def) => {
            if (!def.children) {
              return (
                <Item
                  key={def.text}
                  icon={def.icon}
                  text={def.text}
                  path={def.path}
                  selected={location.pathname === def.path}
                  disabled={def.disabled}
                  isExpanded={isExpanded}
                />
              );
            }
            return (
              <Group
                key={def.text}
                icon={def.icon}
                text={def.text}
                path={def.path}
                disabled={def.disabled}
                isExpanded={isExpanded}
                onRequestExpand={requestExpand}
              >
                {def.children}
              </Group>
            );
          })}
        </List>
        <Box sx={{ mt: "auto", pb: 1 }}>
          <SidebarVersion isExpanded={isExpanded} />
        </Box>
      </Box>
      <Divider />
      <Box className="my-2 flex flex-col gap-2 px-2">
        <UserMenu isExpanded={isExpanded} />
      </Box>
    </Drawer>
  );
};
