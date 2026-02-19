import type { Prisma, SubmissionStatus } from "@repo/database";
import type { GetAllOrganizationsResponse } from "@repo/types";
import { kgToTon } from "@/utils/number.js";

export const adminOrganizationSummarySelect = {
  organizationId: true,
  organizationStatus: true,
  isAccredited: true,
  name: true,
  sectorName: true,
  subsectorName: true,
  sizeName: true,
  displayStatus: true,
  lastSubmissionStatus: true,
  hasUnsubmittedChanges: true,
  hasCarbonInventories: true,
  lastMeasurement: true,
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
    status: org.organizationStatus,
    isAccredited: org.isAccredited,
    lastSubmissionStatus:
      (org.lastSubmissionStatus as SubmissionStatus) ?? null,
    hasUnsubmittedChanges: Boolean(org.hasUnsubmittedChanges),
    hasCarbonInventories: org.hasCarbonInventories,
    lastMeasurement: org.lastMeasurement?.toISOString() ?? null,
    totalEmissions: kgToTon(Number(org.totalEmissions)),
  };
}
