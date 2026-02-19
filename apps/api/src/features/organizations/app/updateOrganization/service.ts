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

  return await prismaClient.$transaction(async (tx) => {
    const pendingOrganizationData = await getPendingOrganizationData(
      tx,
      organizationId
    );

    if (pendingOrganizationData) {
      throw new OrganizationUnderReviewError(organizationId);
    }

    const draftOrganizationData = await getDraftOrganizationData(
      tx,
      organizationId
    );

    if (draftOrganizationData) {
      await updateOrganizationData(
        tx,
        draftOrganizationData.id.toString(),
        userId,
        body
      );
      return {
        organizationId: organization.id.toString(),
      };
    }

    const approvedOrganizationData = await getApprovedOrganizationData(
      tx,
      organizationId
    );

    if (approvedOrganizationData) {
      const newOrganizationData = await createOrganizationData(
        tx,
        organizationId,
        userId,
        body
      );
      await createOrganizationDataSubmission(
        tx,
        newOrganizationData.id.toString(),
        userId
      );
      return {
        organizationId: organization.id.toString(),
      };
    }

    const rejectedOrganizationData = await getRejectedOrganizationData(
      tx,
      organizationId
    );

    if (rejectedOrganizationData) {
      await createOrganizationData(tx, organizationId, userId, body);
      return {
        organizationId: organization.id.toString(),
      };
    }

    return {
      organizationId: organization.id.toString(),
    };
  });
};
