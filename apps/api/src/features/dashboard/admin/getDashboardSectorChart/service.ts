import type { PrismaClient } from "@repo/database";
import type { GetAdminDashboardSectorChartResponse } from "@repo/types";
import { getSectorRanking, getSectorEmissions } from "./helpers.js";

export const getDashboardSectorChartService = async (
  prismaClient: PrismaClient,
  limit: number,
  year?: number
): Promise<GetAdminDashboardSectorChartResponse> => {
  const [sectorRanking, sectorEmissions] = await Promise.all([
    getSectorRanking(prismaClient, limit, year),
    getSectorEmissions(prismaClient, limit, year),
  ]);

  return { sectorRanking, sectorEmissions };
};
