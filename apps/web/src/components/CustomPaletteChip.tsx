import { FC, ReactNode } from "react";
import { Chip, ChipProps, Tooltip, Typography } from "@mui/material";
import { alpha, darken } from "@mui/material/styles";
import { CustomPaletteConfig } from "@/labels/status/types";

interface CustomPaletteChipProps {
  config: CustomPaletteConfig;
  size?: ChipProps["size"];
  icon?: ReactNode;
  tooltip?: string;
}

export const CustomPaletteChip: FC<CustomPaletteChipProps> = ({
  config,
  size = "small",
  icon,
  tooltip,
}) => {
  const color = config.color;
  const variant = size === "medium" ? "subtitle1" : "subtitle2";
  const fontWeight = size === "medium" ? "fontWeightMedium" : undefined;
  const iconNode = icon ?? config.icon;
  const tooltipText = tooltip ?? config.tooltip;

  return (
    <Tooltip title={tooltipText}>
      <Chip
        icon={iconNode as ChipProps["icon"]}
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
