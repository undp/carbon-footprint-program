import type { OrganizationStatus, PrismaClient } from "@repo/database";
import type {
  AdminOrganizationSortBy,
  GetAllOrganizationsResponse,
  AdminOrganizationSortOrder,
} from "@repo/types";
import { roundEmissions } from "@/features/carbonInventories/resultsHelpers.js";

export const getAllOrganizationsService = async (
  prismaClient: PrismaClient,
  statuses: OrganizationStatus[],
  limit: number,
  offset: number,
  sortBy: (typeof AdminOrganizationSortBy)[number],
  sortOrder: (typeof AdminOrganizationSortOrder)[number]
): Promise<GetAllOrganizationsResponse> => {
  const [rows, countResult] = await Promise.all([
    prismaClient.adminOrganizationsView.findMany({
      where: { status: { in: statuses } },
      orderBy: { [sortBy]: sortOrder },
      take: limit,
      skip: offset,
    }),
    prismaClient.adminOrganizationsView.count({
      where: { status: { in: statuses } },
    }),
  ]);

  const total = countResult;
  const totalPages = Math.ceil(total / limit);

  return {
    data: rows.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      sector: row.sector,
      subsector: row.subsector,
      size: row.size,
      status: row.status,
      hasCarbonInventories: row.hasCarbonInventories,
      lastEdition: row.lastEdition.toISOString(),
      emissions: roundEmissions(Number(row.emissions)),
      awards: [], // TODO: add awards when they are implemented
    })),
    total,
    limit,
    offset,
    totalPages,
    hasNext: offset + limit < total,
    hasPrev: offset > 0,
  };
};
