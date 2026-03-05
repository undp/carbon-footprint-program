import { type Theme, useTheme } from "@mui/material";
import { OrganizationStatus } from "@repo/types";

export enum AdminOrganizationDisplayStatus {
  WITH_MEASUREMENTS = "WITH_MEASUREMENTS",
  REGISTERED = "REGISTERED",
  NOT_ACCREDITED = "NOT_ACCREDITED",
  BLOCKED = "BLOCKED",
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

export const STATUS_LABEL: Record<AdminOrganizationDisplayStatus, string> = {
  [AdminOrganizationDisplayStatus.WITH_MEASUREMENTS]: "con Mediciones",
  [AdminOrganizationDisplayStatus.REGISTERED]: "Registrada",
  [AdminOrganizationDisplayStatus.NOT_ACCREDITED]: "No acreditada",
  [AdminOrganizationDisplayStatus.BLOCKED]: "Bloqueada",
};

export const STATUS_SORT_ORDER: Record<string, number> = {
  [STATUS_LABEL[AdminOrganizationDisplayStatus.WITH_MEASUREMENTS]]: 0,
  [STATUS_LABEL[AdminOrganizationDisplayStatus.REGISTERED]]: 1,
  [STATUS_LABEL[AdminOrganizationDisplayStatus.NOT_ACCREDITED]]: 2,
  [STATUS_LABEL[AdminOrganizationDisplayStatus.BLOCKED]]: 3,
};

export const useOrganizationDisplayStatus = () => {
  const theme = useTheme();

  const getColor = (status: AdminOrganizationDisplayStatus): string =>
    getStatusColor(status, theme);

  return { getDisplayStatus, getColor, STATUS_LABEL, STATUS_SORT_ORDER };
};
