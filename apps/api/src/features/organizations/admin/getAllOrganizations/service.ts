import type { PrismaClient } from "@repo/database";
import type {
  GetAllOrganizationsResponse,
  GetAllOrganizationsQuery,
  OrganizationDisplayStatus,
} from "@repo/types";
import { SubmissionStatus } from "@repo/database";
import { kgToTon } from "@/utils/number.js";

export const getAllOrganizationsService = async (
  prismaClient: PrismaClient,
  query?: GetAllOrganizationsQuery
): Promise<GetAllOrganizationsResponse> => {
  // Parse pagination parameters
  const limit = query?.limit ?? 10;
  const offset = query?.offset ?? 0;

  // Build where clause for status filtering
  const where = query?.statuses
    ? { displayStatus: { in: query.statuses } }
    : {};

  const sortBy = query?.sortBy || "name";

  const sortOrder = query?.sortOrder || "asc";

  // Build orderBy clause
  const orderBy = { [sortBy]: sortOrder };

  // Fetch paginated data
  const data = await prismaClient.organizationSummaryView.findMany({
    where,
    orderBy,
    skip: offset,
    take: limit,
    select: {
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
    },
  });

  // Get total count for pagination metadata
  const total = await prismaClient.organizationSummaryView.count({ where });

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNext = offset + limit < total;
  const hasPrev = offset > 0;

  // Map to response format
  const organizations = data.map((org) => ({
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
  }));

  return {
    data: organizations,
    total,
    limit,
    offset,
    totalPages,
    hasNext,
    hasPrev,
  };
};
