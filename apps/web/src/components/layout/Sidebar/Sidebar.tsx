import { FC } from "react";
import {
  Box,
  Chip,
  Divider,
  Drawer,
  List,
  Toolbar,
  Typography,
} from "@mui/material";
import { useLocation } from "@tanstack/react-router";
import { HuellaLatamLogo } from "@icons/HuellaLatamLogo";
import { Item } from "./Item";
import { Group } from "./Group";
import type { SidebarGroupItem } from "./Group";
import { SIDEBAR_WIDTH } from "@/config/constants";
import { UserMenu } from "./UserMenu";
import { APP_VERSION } from "@/config/environment";

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
          overflow: "hidden",
        },
      }}
      variant="permanent"
      anchor="left"
    >
      <Toolbar
        sx={{ px: "8px", py: "16px", gap: 1.5, flexShrink: 0 }}
        disableGutters
      >
        <Box
          sx={{
            mx: 1,
            my: 0.25,
            display: "flex",
            gap: 2.5,
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
          }}
        >
          <HuellaLatamLogo
            sx={{
              width: 116,
              height: 50,
              ...(onLogoClick ? { cursor: "pointer" } : {}),
            }}
            onClick={onLogoClick}
          />
          <Chip
            label={areaLabel}
            size="small"
            color="primary"
            variant="filled"
            sx={{
              height: 26,
              fontSize: 12,
              fontWeight: 600,
              width: 80,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              visibility: areaVariant === "admin" ? "visible" : "hidden",
            }}
          />
        </Box>
      </Toolbar>
      <Divider />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflowY: "auto",
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
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ px: 1, textAlign: "center" }}
            >
              {APP_VERSION}
            </Typography>
          </Box>
        </List>
      </Box>
      <Divider />

      <Box className="my-2 flex flex-col gap-2 px-2">
        <UserMenu />
      </Box>
    </Drawer>
  );
};
