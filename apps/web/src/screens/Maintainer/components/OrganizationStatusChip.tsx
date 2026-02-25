import { FC } from "react";
import { alpha, Box, Typography, useTheme, type Theme } from "@mui/material";
import { OrganizationStatus } from "@repo/types";

export enum AdminOrganizationDisplayStatus {
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

export const getDisplayStatus = (
  status: OrganizationStatus,
  isAccredited: boolean,
  hasCarbonInventories: boolean
): AdminOrganizationDisplayStatus => {
  if (status === OrganizationStatus.BLOCKED)
    return AdminOrganizationDisplayStatus.BLOCKED;

  if (isAccredited) {
    if (hasCarbonInventories)
      return AdminOrganizationDisplayStatus.WITH_MEASUREMENTS;
    return AdminOrganizationDisplayStatus.REGISTERED;
  }

  return AdminOrganizationDisplayStatus.NOT_ACCREDITED;
};

const getStatusColor = (
  status: AdminOrganizationDisplayStatus,
  theme: Theme
): string => {
  const map: Record<AdminOrganizationDisplayStatus, string> = {
    [AdminOrganizationDisplayStatus.WITH_MEASUREMENTS]:
      theme.palette.success.light,
    [AdminOrganizationDisplayStatus.REGISTERED]: theme.palette.info.light,
    [AdminOrganizationDisplayStatus.NOT_ACCREDITED]: theme.palette.grey[500],
    [AdminOrganizationDisplayStatus.BLOCKED]: theme.palette.error.main,
  };
  return map[status];
};

const statusLabels: Record<AdminOrganizationDisplayStatus, string> = {
  [AdminOrganizationDisplayStatus.WITH_MEASUREMENTS]: "con Mediciones",
  [AdminOrganizationDisplayStatus.REGISTERED]: "Registrada",
  [AdminOrganizationDisplayStatus.NOT_ACCREDITED]: "No acreditada",
  [AdminOrganizationDisplayStatus.BLOCKED]: "Bloqueada",
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
