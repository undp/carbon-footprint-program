import { OrganizationStatus } from "@repo/types";

export enum AdminOrganizationDisplayStatus {
  WITH_MEASUREMENTS = "WITH_MEASUREMENTS",
  ACCREDITED = "ACCREDITED",
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
    return AdminOrganizationDisplayStatus.ACCREDITED;
  }

  return AdminOrganizationDisplayStatus.NOT_ACCREDITED;
};
