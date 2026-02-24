import type { Prisma } from "@repo/database";
import type { GetAllOrganizationsResponse } from "@repo/types";
import { kgToTon } from "@/utils/number.js";

export const adminOrganizationSummaryViewInclude = {
  organizationData: {
    select: {
      legalName: true,
      tradeName: true,
      taxId: true,
      sector: { select: { name: true } },
      subsector: { select: { name: true } },
      countryOrganizationSize: { select: { name: true } },
    },
  },
  organization: {
    select: {
      status: true,
    },
  },
} satisfies Prisma.OrganizationSummaryViewInclude;

export type OrganizationSummaryViewRow =
  Prisma.OrganizationSummaryViewGetPayload<{
    include: typeof adminOrganizationSummaryViewInclude;
  }>;

export function mapAdminOrganizationSummaryToResponse(
  org: OrganizationSummaryViewRow
): GetAllOrganizationsResponse["data"][number] {
  return {
    id: org.organizationId.toString(),
    name: org.name,
    sectorName: org.organizationData.sector?.name ?? null,
    subsectorName: org.organizationData.subsector?.name ?? null,
    sizeName: org.organizationData.countryOrganizationSize?.name ?? null,
    status: org.organization.status,
    isAccredited: org.isAccredited,
    lastSubmissionStatus: org.lastSubmissionStatus ?? null,
    hasUnsubmittedChanges: org.hasUnsubmittedChanges,
    hasCarbonInventories: org.hasCarbonInventories,
    lastMeasurement: org.lastMeasurement?.toISOString() ?? null,
    totalEmissions: kgToTon(Number(org.totalEmissions)),
  };
}
