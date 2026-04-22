import { FC } from "react";
import { Box, Button, Typography } from "@mui/material";
import type { BadgeDTO } from "@repo/types";
import { formatDate } from "@/utils/formatting";
import { BadgePreview } from "./BadgePreview";

interface ActiveBadgeCardContentProps {
  active: BadgeDTO;
  disabled: boolean;
  onDeactivate: () => void;
}

export const ActiveBadgeCardContent: FC<ActiveBadgeCardContentProps> = ({
  active,
  disabled,
  onDeactivate,
}) => (
  <Box>
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
    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
      <Button
        variant="outlined"
        color="warning"
        size="small"
        onClick={onDeactivate}
        disabled={disabled}
      >
        Desactivar
      </Button>
    </Box>
  </Box>
);
