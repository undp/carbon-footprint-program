import type { PrismaClient } from "@repo/database";
import type {
  UpdateOrganizationBody,
  UpdateOrganizationResponse,
} from "@repo/types";
import { MembershipStatus } from "@repo/database";
import {
  OrganizationAccessDeniedError,
  OrganizationNotFoundError,
  OrganizationUnderReviewError,
} from "../../errors.js";
import {
  updateOrganizationData,
  getDraftOrganizationData,
  getApprovedOrganizationData,
  getPendingOrganizationData,
  getRejectedOrganizationData,
  createOrganizationData,
  createOrganizationDataSubmission,
} from "../../helpers.js";

/**
 * Updates organization data with a simple update strategy.
 * Finds the ACTIVE organization_data and updates it in place.
 */
export const updateOrganizationService = async (
  prismaClient: PrismaClient,
  organizationId: string,
  userId: string,
  body: UpdateOrganizationBody
): Promise<UpdateOrganizationResponse> => {
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

  const pendingOrganizationData = await getPendingOrganizationData(
    prismaClient,
    organizationId
  );

  if (pendingOrganizationData) {
    throw new OrganizationUnderReviewError(organizationId);
  }

  const draftOrganizationData = await getDraftOrganizationData(
    prismaClient,
    organizationId
  );

  if (draftOrganizationData) {
    await updateOrganizationData(
      prismaClient,
      draftOrganizationData.id.toString(),
      userId,
      body
    );
  }

  const approvedOrganizationData = await getApprovedOrganizationData(
    prismaClient,
    organizationId
  );

  if (approvedOrganizationData) {
    const newOrganizationData = await createOrganizationData(
      prismaClient,
      organizationId,
      userId,
      body
    );
    await createOrganizationDataSubmission(
      prismaClient,
      newOrganizationData.id.toString(),
      userId
    );
  }

  const rejectedOrganizationData = await getRejectedOrganizationData(
    prismaClient,
    organizationId
  );
  if (rejectedOrganizationData) {
    await createOrganizationData(prismaClient, organizationId, userId, body);
  }

  return {
    organizationId: organization.id.toString(),
  };
};
