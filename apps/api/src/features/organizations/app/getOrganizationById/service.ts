import type { PrismaClient } from "@repo/database";
import type { GetOrganizationByIdResponse } from "@repo/types";
import {
  OrganizationNotFoundError,
  OrganizationAccessDeniedError,
} from "../../errors.js";
import { MembershipStatus } from "@repo/database";
import { mapOrganizationSummaryToResponse } from "../mappers.js";

export const getOrganizationByIdService = async (
  prismaClient: PrismaClient,
  userId: string,
  organizationId: string
): Promise<GetOrganizationByIdResponse> => {
  const org = await prismaClient.organizationSummaryView.findUnique({
    where: {
      organizationId: BigInt(organizationId),
    },
  });

  if (!org) {
    throw new OrganizationNotFoundError(organizationId);
  }

  const membership = await prismaClient.userOrganizationMembership.findFirst({
    where: {
      userId: BigInt(userId),
      organizationId: BigInt(organizationId),
      status: MembershipStatus.ACTIVE,
    },
  });

  if (!membership) {
    throw new OrganizationAccessDeniedError(organizationId);
  }

  return mapOrganizationSummaryToResponse(org);
};
