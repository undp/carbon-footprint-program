import type { OrganizationBranch as PrismaBranch } from "@repo/database";
import type { OrganizationBranch } from "@repo/types";

export const mapOrganizationBranchToResponse = (
  branch: PrismaBranch
): OrganizationBranch => ({
  id: branch.id.toString(),
  organizationId: branch.organizationId.toString(),
  name: branch.name,
});
