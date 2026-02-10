import type { PrismaClient } from "@repo/database";
import type { GetOrganizationsKpisResponse } from "@repo/types";

export const getOrganizationsKpisService = async (
  prismaClient: PrismaClient
): Promise<GetOrganizationsKpisResponse> => {
  const groupByResult = await prismaClient.adminOrganizationsView.groupBy({
    by: ["status"],
    _count: true,
  });

  const blockedTotal =
    groupByResult.find((entry) => entry.status === "BLOCKED")?._count ?? 0;
  const notAccreditedTotal =
    groupByResult.find((entry) => entry.status === "NOT_ACCREDITED")?._count ??
    0;
  const accreditedTotal =
    groupByResult.find((entry) => entry.status === "ACCREDITED")?._count ?? 0;
  const total = groupByResult.reduce((sum, entry) => sum + entry._count, 0);

  return {
    total,
    blockedTotal,
    notAccreditedTotal,
    accreditedTotal,
  };
};
