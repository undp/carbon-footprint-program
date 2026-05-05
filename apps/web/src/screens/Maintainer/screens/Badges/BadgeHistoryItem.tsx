import { FC, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { BrokenImageOutlined, RefreshOutlined } from "@mui/icons-material";
import type { BadgeDTO } from "@repo/types";
import { formatter } from "@/utils/formatting";

interface BadgeHistoryItemProps {
  badge: BadgeDTO;
  highlight: boolean;
  disabled: boolean;
  onActivate: (badge: BadgeDTO) => void;
}

export const BadgeHistoryItem: FC<BadgeHistoryItemProps> = ({
  badge,
  highlight,
  disabled,
  onActivate,
}) => {
  const [broken, setBroken] = useState(false);
  const [attempt, setAttempt] = useState(0);

  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      {broken ? (
        <Box
          sx={{
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "action.hover",
            borderRadius: 0.5,
            border: "1px solid",
            borderColor: "divider",
            flexShrink: 0,
          }}
        >
          <Tooltip title="Reintentar carga">
            <IconButton
              size="small"
              onClick={() => {
                setBroken(false);
                setAttempt((a) => a + 1);
              }}
            >
              <RefreshOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box
          key={attempt}
          component="img"
          src={badge.previewUrl}
          alt={badge.fileName}
          onError={() => setBroken(true)}
          sx={{
            width: 40,
            height: 40,
            objectFit: "contain",
            borderRadius: 0.5,
            border: "1px solid",
            borderColor: "divider",
            flexShrink: 0,
            opacity: highlight ? 1 : 0.85,
          }}
        />
      )}
      {broken && !attempt && (
        <BrokenImageOutlined
          fontSize="small"
          color="disabled"
          sx={{ display: "none" }}
        />
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap>
          {badge.fileName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatter.date(badge.createdAt)}
        </Typography>
        {highlight && (
          <Typography variant="caption" color="primary" display="block">
            Recién subido · ¿Activar este sello?
          </Typography>
        )}
      </Box>
      <Button
        variant="outlined"
        size="small"
        onClick={() => onActivate(badge)}
        disabled={disabled}
        sx={{ flexShrink: 0 }}
      >
        Activar
      </Button>
    </Stack>
  );
};
