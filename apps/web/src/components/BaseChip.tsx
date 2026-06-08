import { FC, ReactNode } from "react";
import { Chip, ChipProps, Tooltip, Typography } from "@mui/material";
import { alpha, darken } from "@mui/material/styles";

interface BaseChipProps {
  color: string;
  label: ReactNode;
  tooltip: string;
  size?: ChipProps["size"];
}

export const BaseChip: FC<BaseChipProps> = ({
  color,
  label,
  tooltip,
  size = "small",
}) => {
  const variant = size === "medium" ? "subtitle1" : "subtitle2";
  const fontWeight = size === "medium" ? "fontWeightMedium" : undefined;

  return (
    <Tooltip title={tooltip}>
      <Chip
        size={size}
        sx={{
          height: "auto",
          padding: "4px 8px",
          backgroundColor: alpha(color, 0.2),
          color: darken(color, 0.3),
          border: `1px solid ${alpha(color, 0.3)}`,
          textTransform: "uppercase",
          "& .MuiChip-label": {
            display: "flex",
            alignItems: "center",
          },
        }}
        label={
          <Typography
            component="span"
            variant={variant}
            fontWeight={fontWeight}
            lineHeight={1.2}
          >
            {label}
          </Typography>
        }
      />
    </Tooltip>
  );
};
