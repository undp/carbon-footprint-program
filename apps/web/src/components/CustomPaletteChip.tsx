import { FC } from "react";
import { ChipProps } from "@mui/material";
import { CustomPaletteConfig } from "@/labels/chips/types";
import { BaseChip } from "./BaseChip";

interface CustomPaletteChipProps {
  config: CustomPaletteConfig;
  size?: ChipProps["size"];
  icon?: ChipProps["icon"];
}

export const CustomPaletteChip: FC<CustomPaletteChipProps> = ({
  config,
  size,
  icon,
}) => (
  <BaseChip
    color={config.color}
    label={config.label}
    tooltip={config.tooltip}
    size={size}
    icon={icon ?? config.icon}
  />
);
