import { FC } from "react";
import { alpha, Box, Typography } from "@mui/material";

interface SubmissionTypeChipProps {
  label: string;
  color: string;
}

export const SubmissionTypeChip: FC<SubmissionTypeChipProps> = ({
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
        height: "24px",
        borderRadius: "6px",
        backgroundColor: alpha(color, 0.2),
        color: color,
      }}
    >
      <Typography variant="caption" fontWeight="fontWeightMedium">
        {label}
      </Typography>
    </Box>
  );
};
