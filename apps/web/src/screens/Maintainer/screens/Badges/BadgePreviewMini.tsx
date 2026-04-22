import { FC, useState } from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { BrokenImageOutlined, RefreshOutlined } from "@mui/icons-material";
import type { BadgeDTO } from "@repo/types";

interface BadgePreviewMiniProps {
  badge: BadgeDTO;
  label: string;
}

export const BadgePreviewMini: FC<BadgePreviewMiniProps> = ({
  badge,
  label,
}) => {
  const [broken, setBroken] = useState(false);
  const [attempt, setAttempt] = useState(0);

  return (
    <Box sx={{ textAlign: "center", flex: 1 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        mb={1}
      >
        {label}
      </Typography>
      {broken ? (
        <Box
          sx={{
            width: 80,
            height: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
            bgcolor: "action.hover",
            borderRadius: 1,
            mx: "auto",
          }}
        >
          <BrokenImageOutlined color="disabled" fontSize="small" />
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
            width: 80,
            height: 80,
            objectFit: "contain",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            p: 0.5,
            display: "block",
            mx: "auto",
          }}
        />
      )}
      <Typography variant="caption" noWrap display="block" mt={0.5}>
        {badge.fileName}
      </Typography>
    </Box>
  );
};
