import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { FiberManualRecord as DotIcon } from "@mui/icons-material";
import { alpha, useTheme } from "@mui/material/styles";

interface Props {
  variant: "success" | "warning" | "error";
  title: string;
  subtitle?: string;
}

export const InfoBanner: FC<Props> = ({ variant, title, subtitle }) => {
  const theme = useTheme();
  const color = theme.palette[variant].main;

  return (
    <Box
      className="flex items-center gap-2 rounded-lg border-2 p-3"
      sx={{
        borderColor: `${variant}.main`,
        backgroundColor: alpha(color, 0.04),
      }}
    >
      <DotIcon sx={{ fontSize: 12, color: `${variant}.main` }} />
      <Box>
        <Typography variant="body2" fontWeight={600}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
