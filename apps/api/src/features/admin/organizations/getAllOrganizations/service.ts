import type { OrganizationStatus, PrismaClient } from "@repo/database";
import type {
  AdminOrganizationSortBy,
  GetAllOrganizationsResponse,
  AdminOrganizationSortOrder,
} from "@repo/types";
import { roundEmissions } from "@/features/carbonInventories/utils.js";

export const getAllOrganizationsService = async (
  prismaClient: PrismaClient,
  statuses: OrganizationStatus[],
  limit: number,
  offset: number,
  sortBy: (typeof AdminOrganizationSortBy)[number],
  sortOrder: (typeof AdminOrganizationSortOrder)[number]
): Promise<GetAllOrganizationsResponse> => {
  const defaultLimit = 10;
  const rawLimit = limit ?? defaultLimit;
  const normalizedLimit = rawLimit > 0 ? rawLimit : 1;
  const [rows, countResult] = await Promise.all([
    prismaClient.adminOrganizationsView.findMany({
      where: { status: { in: statuses } },
      orderBy: { [sortBy]: sortOrder },
      take: normalizedLimit,
      skip: offset,
    }),
    prismaClient.adminOrganizationsView.count({
      where: { status: { in: statuses } },
    }),
  ]);

  const total = countResult;
  const totalPages = Math.ceil(total / normalizedLimit);

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
      awards: [], // TODO: implement awards
    })),
    total,
    limit: normalizedLimit,
    offset,
    totalPages,
    hasNext: offset + normalizedLimit < total,
    hasPrev: offset > 0,
  };
};
