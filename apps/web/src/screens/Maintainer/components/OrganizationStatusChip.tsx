import { FC } from "react";
import { alpha, Box, Typography, useTheme, type Theme } from "@mui/material";
import { OrganizationStatus } from "@repo/types";

enum OrganizationDisplayStatus {
  WITH_MEASUREMENTS = "WITH_MEASUREMENTS",
  REGISTERED = "REGISTERED",
  NOT_ACCREDITED = "NOT_ACCREDITED",
  BLOCKED = "BLOCKED",
}

interface OrganizationStatusChipProps {
  status: OrganizationStatus;
  isAccredited: boolean;
  hasCarbonInventories: boolean;
}

const getDisplayStatus = (
  status: OrganizationStatus,
  isAccredited: boolean,
  hasCarbonInventories: boolean
): OrganizationDisplayStatus => {
  if (status === "BLOCKED") return OrganizationDisplayStatus.BLOCKED;

  if (hasCarbonInventories && isAccredited)
    return OrganizationDisplayStatus.WITH_MEASUREMENTS;

  if (!hasCarbonInventories && isAccredited)
    return OrganizationDisplayStatus.REGISTERED;

  return OrganizationDisplayStatus.NOT_ACCREDITED;
};

const getStatusColor = (
  status: OrganizationDisplayStatus,
  theme: Theme
): string => {
  const map: Record<OrganizationDisplayStatus, string> = {
    [OrganizationDisplayStatus.WITH_MEASUREMENTS]: theme.palette.success.light,
    [OrganizationDisplayStatus.REGISTERED]: theme.palette.info.light,
    [OrganizationDisplayStatus.NOT_ACCREDITED]: theme.palette.grey[500],
    [OrganizationDisplayStatus.BLOCKED]: theme.palette.error.main,
  };
  return map[status];
};

const statusLabels: Record<OrganizationDisplayStatus, string> = {
  [OrganizationDisplayStatus.WITH_MEASUREMENTS]: "con Mediciones",
  [OrganizationDisplayStatus.REGISTERED]: "Registrada",
  [OrganizationDisplayStatus.NOT_ACCREDITED]: "No acreditada",
  [OrganizationDisplayStatus.BLOCKED]: "Bloqueada",
};

export const OrganizationStatusChip: FC<OrganizationStatusChipProps> = ({
  status,
  isAccredited,
  hasCarbonInventories,
}) => {
  const theme = useTheme();
  const displayStatus = getDisplayStatus(
    status,
    isAccredited,
    hasCarbonInventories
  );
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
