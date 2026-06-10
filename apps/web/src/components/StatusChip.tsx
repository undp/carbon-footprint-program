import { FC } from "react";
import { ChipProps, useTheme } from "@mui/material";
import { StatusConfig } from "@/labels/chips/types";
import { BaseChip } from "./BaseChip";

interface StatusChipProps {
  config: StatusConfig;
  size?: ChipProps["size"];
}

export const StatusChip: FC<StatusChipProps> = ({ config, size }) => {
  const theme = useTheme();
  return (
    <BaseChip
      color={theme.palette.statusFamilyColors[config.family]}
      label={config.label}
      tooltip={config.tooltip}
      size={size}
    />
  );
};
