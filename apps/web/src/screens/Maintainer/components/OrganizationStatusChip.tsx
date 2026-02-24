import { FC } from "react";
import { alpha, Box, Typography, useTheme, type Theme } from "@mui/material";

type OrganizationDisplayStatus =
  | "WITH_MEASUREMENTS"
  | "REGISTERED"
  | "NOT_ACCREDITED";

interface OrganizationStatusChipProps {
  isAccredited: boolean;
  hasCarbonInventories: boolean;
}

const getDisplayStatus = (
  isAccredited: boolean,
  hasCarbonInventories: boolean
): OrganizationDisplayStatus => {
  if (hasCarbonInventories && isAccredited) return "WITH_MEASUREMENTS";
  if (!hasCarbonInventories && isAccredited) return "REGISTERED";
  return "NOT_ACCREDITED";
};

const getStatusColor = (
  status: OrganizationDisplayStatus,
  theme: Theme
): string => {
  const map: Record<OrganizationDisplayStatus, string> = {
    WITH_MEASUREMENTS: theme.palette.success.light,
    REGISTERED: theme.palette.info.light,
    NOT_ACCREDITED: theme.palette.grey[500],
  };
  return map[status];
};

const statusLabels: Record<OrganizationDisplayStatus, string> = {
  WITH_MEASUREMENTS: "con Mediciones",
  REGISTERED: "Registrada",
  NOT_ACCREDITED: "No acreditada",
};

export const OrganizationStatusChip: FC<OrganizationStatusChipProps> = ({
  isAccredited,
  hasCarbonInventories,
}) => {
  const theme = useTheme();
  const displayStatus = getDisplayStatus(isAccredited, hasCarbonInventories);
  const color = getStatusColor(displayStatus, theme);

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
        {statusLabels[displayStatus]}
      </Typography>
    </Box>
  );
};
