import type { PrismaClient } from "@repo/database";
import type { GetAdminDashboardKpisResponse } from "@repo/types";
import {
  getOrganizationKpis,
  getEmissionsData,
  getRecognitionCounts,
} from "./helpers.js";

export const getDashboardKpisService = async (
  prismaClient: PrismaClient,
  year?: number
): Promise<GetAdminDashboardKpisResponse> => {
  const [
    { totalOrganizations, measuringOrganizations },
    emissionsData,
    { earned: recognitionsEarned, underReview: recognitionsUnderReview },
  ] = await Promise.all([
    getOrganizationKpis(prismaClient, year),
    getEmissionsData(prismaClient, year),
    getRecognitionCounts(prismaClient, year),
  ]);

  return {
    totalOrganizations,
    measuringOrganizations,
    totalEmissions: emissionsData.totalEmissions,
    verifiedEmissions: emissionsData.verifiedEmissions,
    recognitionsEarned,
    recognitionsUnderReview,
  };
};
