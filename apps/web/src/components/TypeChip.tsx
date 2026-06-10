import { FC, ReactNode } from "react";
import { Chip, ChipProps, Tooltip } from "@mui/material";
import { alpha, darken } from "@mui/material/styles";

interface TypeChipProps {
  color: string;
  label: ReactNode;
  tooltip: string;
  icon?: ChipProps["icon"];
  size?: ChipProps["size"];
}

/**
 * Filled categorical chip (solid-ish fill + matching border) shared by the
 * recognition-type and submission-type chips so their look can't drift apart.
 */
export const TypeChip: FC<TypeChipProps> = ({
  color,
  label,
  tooltip,
  icon,
  size = "small",
}) => (
  <Tooltip title={tooltip}>
    <Chip
      icon={icon}
      size={size}
      label={label}
      sx={{
        height: 26,
        backgroundColor: alpha(color, 0.6),
        border: `1px solid ${color}`,
        color: darken(color, 0.7),
        fontWeight: 500,
        "& .MuiChip-label": { display: "flex", alignItems: "center" },
      }}
    />
  </Tooltip>
);
