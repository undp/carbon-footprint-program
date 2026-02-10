import type { PrismaClient } from "@repo/database";
import { OrganizationStatus } from "@repo/types";
import type { GetOrganizationsKpisResponse } from "@repo/types";

export const getOrganizationsKpisService = async (
  prismaClient: PrismaClient
): Promise<GetOrganizationsKpisResponse> => {
  const groupByResult = await prismaClient.adminOrganizationsView.groupBy({
    by: ["status"],
    _count: true,
  });

  const countsMap = new Map(
    groupByResult.map((entry) => [entry.status, entry._count])
  );

  const blockedTotal = countsMap.get(OrganizationStatus.BLOCKED) ?? 0;
  const notAccreditedTotal =
    countsMap.get(OrganizationStatus.NOT_ACCREDITED) ?? 0;
  const accreditedTotal = countsMap.get(OrganizationStatus.ACCREDITED) ?? 0;
  const total = blockedTotal + notAccreditedTotal + accreditedTotal;

  return {
    total,
    blockedTotal,
    notAccreditedTotal,
    accreditedTotal,
  };
};
