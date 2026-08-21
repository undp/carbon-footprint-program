import type { PrismaClient } from "@repo/database";
import type { GetOrganizationByIdResponse } from "@repo/types";
import { OrganizationNotFoundError } from "../../errors.js";
import {
  mapOrganizationSummary,
  territoryWithAncestorsInclude,
} from "../../../../mappers/index.js";

export const getOrganizationByIdService = async (
  prismaClient: PrismaClient,
  organizationId: string
): Promise<GetOrganizationByIdResponse> => {
  const org = await prismaClient.organizationSummaryView.findUnique({
    where: {
      organizationId: BigInt(organizationId),
    },
    include: {
      organizationData: {
        include: {
          sector: true,
          subsector: true,
          secondarySubsector: true,
          territory: territoryWithAncestorsInclude,
          countryOrganizationSize: true,
          mainActivity: true,
          representativeCountryJobPosition: true,
        },
      },
    },
  });

  if (!org) {
    throw new OrganizationNotFoundError(organizationId);
  }

  return mapOrganizationSummary(org);
};
