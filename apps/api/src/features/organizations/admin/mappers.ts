import type { Prisma, SubmissionStatus } from "@repo/database";
import type {
  OrganizationDisplayStatus,
  GetAllOrganizationsResponse,
} from "@repo/types";
import { kgToTon } from "@/utils/number.js";

export const adminOrganizationSummarySelect = {
  organizationId: true,
  name: true,
  sectorName: true,
  subsectorName: true,
  sizeName: true,
  displayStatus: true,
  lastSubmissionStatus: true,
  hasUnsubmittedChanges: true,
  hasCarbonInventories: true,
  lastEdition: true,
  totalEmissions: true,
} satisfies Prisma.OrganizationSummaryViewSelect;

export type OrganizationSummaryViewRow =
  Prisma.OrganizationSummaryViewGetPayload<{
    select: typeof adminOrganizationSummarySelect;
  }>;

export function mapAdminOrganizationSummaryToResponse(
  org: OrganizationSummaryViewRow
): GetAllOrganizationsResponse["data"][number] {
  return {
    id: org.organizationId.toString(),
    name: org.name,
    sectorName: org.sectorName,
    subsectorName: org.subsectorName,
    sizeName: org.sizeName,
    status: org.displayStatus as OrganizationDisplayStatus,
    lastSubmissionStatus:
      (org.lastSubmissionStatus as SubmissionStatus) ?? null,
    hasUnsubmittedChanges: Boolean(org.hasUnsubmittedChanges),
    hasCarbonInventories: org.hasCarbonInventories,
    lastEdition: org.lastEdition ? org.lastEdition.toISOString() : null,
    totalEmissions: kgToTon(Number(org.totalEmissions)),
  };
}
