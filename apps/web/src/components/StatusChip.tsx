import { FC } from "react";
import { Chip, ChipProps, Tooltip, Typography, useTheme } from "@mui/material";
import { alpha, darken } from "@mui/material/styles";
import { StatusConfig } from "@/labels/chips/types";

interface StatusChipProps {
  config: StatusConfig;
  size?: ChipProps["size"];
  icon?: ChipProps["icon"];
}

export const StatusChip: FC<StatusChipProps> = ({
  config,
  size = "small",
  icon,
}) => {
  const theme = useTheme();
  const color = theme.palette.statusFamilyColors[config.family];
  const variant = size === "medium" ? "subtitle1" : "subtitle2";
  const fontWeight = size === "medium" ? "fontWeightMedium" : undefined;
  const iconNode = icon ?? config.icon;

  return (
    <Tooltip title={config.tooltip}>
      <Chip
        icon={iconNode}
        size={size}
        sx={{
          padding: "6px 8px",
          backgroundColor: alpha(color, 0.2),
          color: darken(color, 0.3),
          border: `1px solid ${alpha(color, 0.3)}`,
          textTransform: "uppercase",
        }}
        label={
          <Typography variant={variant} fontWeight={fontWeight}>
            {config.label}
          </Typography>
        }
      />
    </Tooltip>
  );
};
