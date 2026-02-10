import type { OrganizationStatus, PrismaClient } from "@repo/database";
import type { GetAllOrganizationsResponse } from "@repo/types";

export const GetAllOrganizationsService = async (
  prismaClient: PrismaClient,
  statuses: string[],
  limit: number,
  offset: number,
  sortBy: string,
  sortOrder: string
): Promise<GetAllOrganizationsResponse> => {
  const [rows, countResult] = await Promise.all([
    prismaClient.adminOrganizationsView.findMany({
      where: { status: { in: statuses as OrganizationStatus[] } },
      orderBy: { [sortBy]: sortOrder },
      take: limit,
      skip: offset,
    }),
    prismaClient.adminOrganizationsView.count({
      where: { status: { in: statuses as OrganizationStatus[] } },
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
      emissions: Number(row.emissions),
      awards: [],
    })),
    total,
    limit,
    offset,
    totalPages,
    hasNext: offset + limit < total,
    hasPrev: offset > 0,
  };
};
