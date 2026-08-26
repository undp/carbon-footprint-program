import { FC } from "react";
import { Box, Chip, IconButton, Toolbar, Tooltip, alpha } from "@mui/material";
import { MenuRounded, PushPinRounded } from "@mui/icons-material";
import { BrandLockup } from "@/components/BrandLockup";
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

/**
 * The expanded row lays the wordmark, the area chip and the pin out at fixed
 * widths, so the three of them have to fit inside `SIDEBAR_WIDTH` minus the
 * gutters of the toolbar: whatever lands past that edge is cut away by the
 * drawer's `overflowX: hidden` instead of wrapping. They currently add up to
 * ~241px of the ~247px the expanded rail offers, so keep an eye on that budget
 * whenever one of them grows.
 */
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
          flex: 1,
          minWidth: 0,
          mx: 1,
          my: 0.25,
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
            gap: 0.75,
            opacity: isExpanded ? 1 : 0,
            pointerEvents: isExpanded ? "auto" : "none",
            transition: sidebarTransition(theme, "opacity"),
          })}
        >
          <Box
            onClick={onLogoClick}
            sx={{
              flexShrink: 0,
              ...(onLogoClick ? { cursor: "pointer" } : {}),
            }}
          >
            <BrandLockup
              markHeight={30}
              nameFontSize={12}
              territoryFontSize={7}
              showTerritory={false}
              gap={1}
            />
          </Box>
          <Chip
            label={areaLabel}
            size="small"
            color="primary"
            variant="filled"
            sx={{
              height: 22,
              fontSize: 10,
              fontWeight: 600,
              width: 54,
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
