import type { PrismaClient } from "@repo/database";
import type {
  UpdateOrganizationBody,
  UpdateOrganizationResponse,
} from "@repo/types";
import {
  OrganizationDataNotFoundError,
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
 * Updates organization data based on current submission state.
 *
 * State Machine Behavior:
 * ----------------------
 * 1. PENDING (under review):
 *    - Throws OrganizationUnderReviewError
 *    - User must wait for admin approval/rejection before making changes
 *
 * 2. DRAFT (no submission):
 *    - Updates the existing organization data in place
 *    - No new submission is created
 *    - Changes remain as draft until explicitly submitted
 *
 * 3. APPROVED (accredited):
 *    - Creates NEW organization data record with changes
 *    - Automatically creates and submits for review (PENDING status)
 *    - Original approved data remains unchanged
 *    - New changes require admin approval before taking effect
 *
 * 4. REJECTED (previously rejected):
 *    - Creates NEW organization data as draft
 *    - No automatic submission - user can edit freely
 *    - User must explicitly request accreditation when ready
 *
 * Note: This ensures approved organizations maintain their accredited data
 * while new changes go through review process.
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
        id: organization.id.toString(),
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
        id: organization.id.toString(),
      };
    }

    const rejectedOrganizationData = await getRejectedOrganizationData(
      tx,
      organizationId
    );

    if (rejectedOrganizationData) {
      await createOrganizationData(tx, organizationId, userId, body);
      return {
        id: organization.id.toString(),
      };
    }

    throw new OrganizationDataNotFoundError(organizationId);
  });
};
