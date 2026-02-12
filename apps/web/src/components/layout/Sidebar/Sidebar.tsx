import { FC } from "react";
import { Divider, Drawer, List, Toolbar } from "@mui/material";
import { useLocation } from "@tanstack/react-router";
import { HuellaLatamLogo } from "@icons/HuellaLatamLogo";
import { Item } from "./Item";
import { Group } from "./Group";
import type { SidebarGroupItem } from "./Group";
import { SIDEBAR_WIDTH } from "@/config/constants";

export interface SidebarDef extends SidebarGroupItem {
  children?: SidebarGroupItem[];
}

interface Props {
  items: SidebarDef[];
  footer?: React.ReactNode;
  onLogoClick?: () => void;
}

export const Sidebar: FC<Props> = ({ items, footer, onLogoClick }) => {
  const location = useLocation();

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
            ...(onLogoClick ? { cursor: "pointer" } : {}),
          }}
          onClick={onLogoClick}
        />
      </Toolbar>
      <Divider />

      <List sx={{ pt: 0 }}>
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
            >
              {def.children}
            </Group>
          );
        })}
      </List>

      {footer}
    </Drawer>
  );
};
