import { OrganizationStatus } from "@repo/types";
import { AdminOrganizationDisplayStatus } from "@/labels/chips/organization";

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
