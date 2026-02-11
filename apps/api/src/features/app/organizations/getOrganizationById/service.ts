import { PrismaClient } from "@repo/database";
import type { GetOrganizationByIdResponse } from "@repo/types";
import {
  OrganizationDataNotFoundError,
  OrganizationNotFoundError,
} from "../errors.js";
import {
  mapOrganizationDataToResponse,
  OrganizationDataWithRelations,
} from "../mappers.js";

export const getOrganizationByIdService = async (
  prisma: PrismaClient,
  id: string
): Promise<GetOrganizationByIdResponse> => {
  const orgId = BigInt(id);
  // TODO: add user
  // 1. Check organization + membership in single query
  // const organization = await prisma.organization.findUnique({
  //   where: { id: orgId },
  //   include: {
  //     memberships: {
  //       where: {
  //         userId: authUserId,
  //         status: MembershipStatus.ACTIVE,
  //       },
  //     },
  //   },
  // });

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
  });
  if (!organization) throw new OrganizationNotFoundError(id);
  // // TODO: check if user is member of the organization correctly
  // if (organization.memberships.length === 0) {
  //   throw new OrganizationAccessDeniedError(id);
  // }

  // 2. Get most recent organization data with priority: COMPLETED > SUBMITTED > DRAFT
  const organizationData = await prisma.organizationData.findFirst({
    where: { organizationId: orgId },
    orderBy: [
      { status: "desc" }, // COMPLETED (2) > SUBMITTED (1) > DRAFT (0) - assuming enum order or explicit logic
      { updatedAt: "desc" },
    ],
    include: {
      countryOrganizationSize: true,
      sector: true,
      subsector: true,
      representativeCountryJobPosition: true,
    },
  });

  if (!organizationData) throw new OrganizationDataNotFoundError(id);

  return mapOrganizationDataToResponse(
    organizationData as OrganizationDataWithRelations
  );
};
