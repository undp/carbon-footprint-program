import { FC } from "react";
import { Box, CircularProgress } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { BadgeDTO } from "@repo/types";
import { ActiveBadgeCardContent } from "./ActiveBadgeCardContent";
import { InactiveBadgeCardContent } from "./InactiveBadgeCardContent";

interface BadgeCardContentProps {
  activeBadge: BadgeDTO | null;
  isUploading: boolean;
}

export const BadgeCardContent: FC<BadgeCardContentProps> = ({
  activeBadge,
  isUploading,
}) => (
  <Box
    sx={{
      position: "relative",
      flex: 1,
      display: "flex",
      flexDirection: "column",
    }}
  >
    {activeBadge ? (
      <ActiveBadgeCardContent badge={activeBadge} />
    ) : (
      <InactiveBadgeCardContent />
    )}
    {isUploading && (
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          backgroundColor: (theme) =>
            alpha(theme.palette.background.paper, 0.75),
          borderRadius: 1,
          zIndex: 1,
        }}
      >
        <CircularProgress size={32} />
      </Box>
    )}
  </Box>
);
