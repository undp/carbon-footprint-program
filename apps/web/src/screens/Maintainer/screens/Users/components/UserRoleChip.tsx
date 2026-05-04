import { FC } from "react";
import { alpha, Box, Typography, useTheme } from "@mui/material";
import { SystemRole } from "@repo/types";
import { ROLE_LABELS } from "../constants";

interface UserRoleChipProps {
  role: SystemRole;
}

export const UserRoleChip: FC<UserRoleChipProps> = ({ role }) => {
  const theme = useTheme();
  const color = theme.palette.roleColors[role];

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
        {ROLE_LABELS[role]}
      </Typography>
    </Box>
  );
};
