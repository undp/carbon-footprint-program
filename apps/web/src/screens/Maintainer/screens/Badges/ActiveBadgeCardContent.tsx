import { FC } from "react";
import { Box, Typography } from "@mui/material";
import type { BadgeDTO } from "@repo/types";
import { formatDate } from "@/utils/formatting";
import { BadgePreview } from "./BadgePreview";

interface ActiveBadgeCardContentProps {
  active: BadgeDTO;
}

export const ActiveBadgeCardContent: FC<ActiveBadgeCardContentProps> = ({
  active,
}) => (
  <Box
    sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      flex: 1,
    }}
  >
    <BadgePreview src={active.previewUrl} alt={active.fileName} />
    <Typography
      variant="body2"
      color="text.secondary"
      align="center"
      mt={1}
      noWrap
    >
      {active.fileName}
    </Typography>
    <Typography
      variant="caption"
      color="text.disabled"
      align="center"
      display="block"
    >
      {formatDate(active.createdAt)}
    </Typography>
  </Box>
);
