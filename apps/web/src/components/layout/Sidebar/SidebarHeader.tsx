import { FC } from "react";
import { Box, Chip, IconButton, Toolbar, Tooltip, alpha } from "@mui/material";
import { MenuRounded, PushPinRounded } from "@mui/icons-material";
import { HuellaLatamLogo } from "@icons/HuellaLatamLogo";
import { sidebarTransition } from "@/theme";

interface SidebarHeaderProps {
  isExpanded: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
  onLogoClick?: () => void;
  areaLabel?: string;
  areaVariant?: "default" | "admin";
}

const HEADER_ROW_HEIGHT = 40;

export const SidebarHeader: FC<SidebarHeaderProps> = ({
  isExpanded,
  isPinned,
  onTogglePin,
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
          height: HEADER_ROW_HEIGHT,
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
            pointerEvents: isExpanded ? "auto" : "none",
            transition: sidebarTransition(theme, "opacity"),
          })}
        >
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
          <Box sx={{ flex: 1 }} />
          <Tooltip
            title={isPinned ? "Desfijar menú" : "Fijar menú"}
            placement="bottom"
          >
            <IconButton
              onClick={onTogglePin}
              size="small"
              aria-label={isPinned ? "Desfijar menú" : "Fijar menú"}
              aria-pressed={isPinned}
              sx={(theme) => ({
                flexShrink: 0,
                color: isPinned
                  ? theme.palette.primary.main
                  : theme.palette.text.secondary,
                backgroundColor: isPinned
                  ? alpha(theme.palette.primary.main, 0.12)
                  : "transparent",
                transition: theme.transitions.create([
                  "color",
                  "background-color",
                ]),
                "&:hover": {
                  backgroundColor: isPinned
                    ? alpha(theme.palette.primary.main, 0.2)
                    : theme.palette.action.hover,
                },
              })}
            >
              <PushPinRounded sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Toolbar>
  );
};
