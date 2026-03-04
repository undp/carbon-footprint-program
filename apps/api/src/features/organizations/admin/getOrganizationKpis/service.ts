import type { PrismaClient } from "@repo/database";
import { OrganizationStatus } from "@repo/database";
import type { GetOrganizationKpisResponse } from "@repo/types";
import { flatMap, sumBy } from "lodash-es";

export const getOrganizationKpisService = async (
  prismaClient: PrismaClient
): Promise<GetOrganizationKpisResponse> => {
  // Fetch all organizations from the summary view
  const organizations = await prismaClient.organizationSummaryView.groupBy({
    by: ["organizationStatus", "isAccredited", "hasCarbonInventories"],
    _count: true,
  });

  const bucket = new Map<string, number>();
  for (const org of organizations) {
    const key = `${org.organizationStatus}:${org.isAccredited}:${org.hasCarbonInventories}`;
    bucket.set(key, org._count);
  }

  const statuses = Object.values(OrganizationStatus);
  const booleanValues = [true, false];

  const counts = flatMap(statuses, (status) =>
    flatMap(booleanValues, (accredited) =>
      booleanValues.map((withInventories) => {
        const key = `${status}:${accredited}:${withInventories}`;
        return {
          status,
          accredited,
          withInventories,
          count: bucket.get(key) ?? 0,
        };
      })
    )
  );

  return {
    total: sumBy(counts, "count"),
    counts,
  };
};
