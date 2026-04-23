import { FC } from "react";
import { Box, Typography } from "@mui/material";
import type { BadgeDTO } from "@repo/types";
import { formatDate } from "@/utils/formatting";
import { BadgePreview } from "./BadgePreview";

interface ActiveBadgeCardContentProps {
  badge: BadgeDTO;
}

export const ActiveBadgeCardContent: FC<ActiveBadgeCardContentProps> = ({
  badge,
}) => (
  <Box
    sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <BadgePreview src={badge.previewUrl} alt={badge.fileName} />
    <Typography
      variant="body2"
      color="text.secondary"
      align="center"
      mt={1}
      noWrap
    >
      {badge.fileName}
    </Typography>
    <Typography
      variant="caption"
      color="text.disabled"
      align="center"
      display="block"
    >
      {formatDate(badge.createdAt)}
    </Typography>
  </Box>
);
