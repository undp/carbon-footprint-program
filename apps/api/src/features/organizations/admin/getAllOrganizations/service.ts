import type { PrismaClient } from "@repo/database";
import type {
  GetAllOrganizationsResponse,
  GetAllOrganizationsQuery,
} from "@repo/types";
import {
  adminOrganizationSummarySelect,
  mapAdminOrganizationSummaryToResponse,
} from "../mappers.js";

export const getAllOrganizationsService = async (
  prismaClient: PrismaClient,
  query?: GetAllOrganizationsQuery
): Promise<GetAllOrganizationsResponse> => {
  // Parse pagination parameters
  const limit = Math.max(1, query?.limit ?? 10);
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
    select: adminOrganizationSummarySelect,
  });

  // Get total count for pagination metadata
  const total = await prismaClient.organizationSummaryView.count({ where });

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNext = offset + limit < total;
  const hasPrev = offset > 0;

  const organizations: GetAllOrganizationsResponse["data"] = data.map(
    mapAdminOrganizationSummaryToResponse
  );

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
