import type { PrismaClient } from "@repo/database";
import type { RequestOrganizationAccreditationResponse } from "@repo/types";
import {
  MembershipStatus,
  OrganizationDataStatus,
  SubmissionStatus,
  SubmissionSubjectType,
} from "@repo/database";
import {
  OrganizationAccessDeniedError,
  OrganizationDataNotFoundError,
  OrganizationNotFoundError,
  SubmissionAlreadyExistsError,
} from "../../errors.js";
import {
  createOrganizationDataSubmission,
  getPendingOrganizationData,
} from "../../helpers.js";

export const requestOrganizationAccreditationService = async (
  prismaClient: PrismaClient,
  organizationId: string,
  userId: string
): Promise<RequestOrganizationAccreditationResponse> => {
  const organization = await prismaClient.organization.findUnique({
    where: {
      id: BigInt(organizationId),
    },
  });

  if (!organization) {
    throw new OrganizationNotFoundError(organizationId);
  }
  // Verify user has ACTIVE membership
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

  return await prismaClient.$transaction(async (tx) => {
    // Find ACTIVE organization data
    const activeData = await tx.organizationData.findFirst({
      where: {
        organizationId: BigInt(organizationId),
        status: OrganizationDataStatus.ACTIVE,
      },
    });

    if (!activeData) {
      throw new OrganizationDataNotFoundError(organizationId);
    }

    const existingSubmission = await getPendingOrganizationData(
      tx,
      organizationId
    );
    if (existingSubmission) {
      throw new SubmissionAlreadyExistsError(organizationId);
    }

    await createOrganizationDataSubmission(
      tx,
      activeData.id.toString(),
      userId
    );

    return {};
  });
};
