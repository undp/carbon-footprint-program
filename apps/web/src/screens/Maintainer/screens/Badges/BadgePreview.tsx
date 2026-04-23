import { FC, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { BrokenImageOutlined, RefreshOutlined } from "@mui/icons-material";

interface BadgePreviewProps {
  src: string;
  alt: string;
  size?: number;
}

export const BadgePreview: FC<BadgePreviewProps> = ({
  src,
  alt,
  size = 120,
}) => {
  const [broken, setBroken] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (broken) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
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
        <BrokenImageOutlined color="disabled" />
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
    );
  }

  return (
    <Box
      key={attempt}
      component="img"
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      sx={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "block",
        mx: "auto",
        borderRadius: 1,
      }}
    />
  );
};
