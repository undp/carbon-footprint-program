import { FC } from "react";
import { alpha, Box, Typography } from "@mui/material";

interface RequestStatusChipProps {
  label: string;
  color: string;
}

export const RequestStatusChip: FC<RequestStatusChipProps> = ({
  label,
  color,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        width: "fit-content",
        px: 1.5,
        minHeight: "32px",
        borderRadius: "6px",
        backgroundColor: alpha(color, 0.2),
        color,
      }}
    >
      <Typography variant="caption" fontWeight="fontWeightMedium">
        {label}
      </Typography>
    </Box>
  );
};
