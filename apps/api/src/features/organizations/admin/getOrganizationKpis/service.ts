import type { PrismaClient } from "@repo/database";
import { OrganizationStatus } from "@repo/database";
import type { GetOrganizationKpisResponse } from "@repo/types";
import { flatMap } from "lodash-es";

export const getOrganizationKpisService = async (
  prismaClient: PrismaClient
): Promise<GetOrganizationKpisResponse> => {
  // Fetch all organizations from the summary view
  const organizations = await prismaClient.organizationSummaryView.findMany({
    select: {
      organization: {
        select: {
          status: true,
        },
      },
      isAccredited: true,
      hasCarbonInventories: true,
    },
  });

  const statuses: Array<OrganizationStatus> = [
    OrganizationStatus.ACTIVE,
    OrganizationStatus.BLOCKED,
  ];
  const booleanValues = [true, false];

  const counts = flatMap(statuses, (status) =>
    flatMap(booleanValues, (accredited) =>
      booleanValues.map((withInventories) => {
        const count = organizations.filter(
          (org) =>
            org.organization.status === status &&
            org.isAccredited === accredited &&
            org.hasCarbonInventories === withInventories
        ).length;

        return {
          status,
          accredited,
          withInventories,
          count,
        };
      })
    )
  );

  return {
    total: organizations.length,
    counts,
  };
};
