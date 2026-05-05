import { FC } from "react";
import { Box, Chip, Toolbar } from "@mui/material";
import { MenuRounded } from "@mui/icons-material";
import { HuellaLatamLogo } from "@icons/HuellaLatamLogo";
import { sidebarTransition } from "@/theme";

interface SidebarHeaderProps {
  isExpanded: boolean;
  onLogoClick?: () => void;
  areaLabel?: string;
  areaVariant?: "default" | "admin";
}

const MENU_ICON_BOX_SIZE = 40;

export const SidebarHeader: FC<SidebarHeaderProps> = ({
  isExpanded,
  onLogoClick,
  areaLabel,
  areaVariant = "default",
}) => {
  return (
    <Toolbar sx={{ px: "8px", py: "16px", flexShrink: 0 }} disableGutters>
      <Box
        sx={{
          position: "relative",
          mx: 1,
          my: 0.25,
          width: "100%",
          height: MENU_ICON_BOX_SIZE,
        }}
      >
        <Box
          sx={(theme) => ({
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isExpanded ? 0 : 1,
            transition: sidebarTransition(theme, "opacity"),
          })}
        >
          <MenuRounded sx={{ fontSize: 26 }} />
        </Box>
        <Box
          sx={(theme) => ({
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            opacity: isExpanded ? 1 : 0,
            transition: sidebarTransition(theme, "opacity"),
          })}
        >
          <Box
            sx={{
              width: MENU_ICON_BOX_SIZE,
              height: MENU_ICON_BOX_SIZE,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MenuRounded sx={{ fontSize: 26 }} />
          </Box>
          <HuellaLatamLogo
            sx={{
              width: 80,
              height: 36,
              flexShrink: 0,
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
              height: 22,
              fontSize: 10,
              fontWeight: 600,
              width: 62,
              flexShrink: 0,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              visibility: areaVariant === "admin" ? "visible" : "hidden",
            }}
          />
        </Box>
      </Box>
    </Toolbar>
  );
};
