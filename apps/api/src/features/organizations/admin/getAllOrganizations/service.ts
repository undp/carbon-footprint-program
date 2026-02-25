import type { PrismaClient } from "@repo/database";
import type {
  GetAllOrganizationsResponse,
  GetAllOrganizationsQuery,
} from "@repo/types";
import {
  adminOrganizationSummaryViewInclude,
  mapAdminOrganizationSummaryToResponse,
} from "../mappers.js";

export const getAllOrganizationsService = async (
  prismaClient: PrismaClient,
  query?: GetAllOrganizationsQuery
): Promise<GetAllOrganizationsResponse> => {
  // Parse pagination parameters
  const limit = query?.limit;
  const offset = query?.offset ?? 0;

  // Build where clause for status filtering
  const where = query?.statuses
    ? { organization: { status: { in: query.statuses } } }
    : {};

  const sortBy = query?.sortBy || "name";

  const sortOrder = query?.sortOrder || "asc";

  // Build orderBy clause
  const orderBy = { [sortBy]: sortOrder };

  // Fetch data
  const data = await prismaClient.organizationSummaryView.findMany({
    where,
    orderBy,
    skip: offset,
    take: limit,
    include: adminOrganizationSummaryViewInclude,
  });

  const organizations: GetAllOrganizationsResponse["data"] = data.map(
    mapAdminOrganizationSummaryToResponse
  );

  // If no limit is provided, return all records without pagination metadata
  if (!limit) {
    return {
      data: organizations,
    };
  }

  // Get total count
  const total = await prismaClient.organizationSummaryView.count({ where });

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNext = offset + limit < total;
  const hasPrev = offset > 0;

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
