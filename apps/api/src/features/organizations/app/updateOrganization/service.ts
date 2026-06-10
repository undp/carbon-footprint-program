import type { PrismaClient } from "@repo/database";
import type {
  UpdateOrganizationBody,
  UpdateOrganizationResponse,
} from "@repo/types";
import type { StorageAdapter } from "@/services/storage/index.js";
import {
  OrganizationDataNotFoundError,
  OrganizationNotFoundError,
  OrganizationUnderReviewError,
  FileAttachmentsNotSupportedError,
  FileAttachmentsRequiredError,
} from "../../errors.js";
import {
  updateOrganizationData,
  getDraftOrganizationData,
  hasApprovedOrganizationData,
  getPendingOrganizationData,
  createOrganizationData,
  createOrganizationDataSubmission,
  getLastReviewedOrganizationData,
} from "../../helpers.js";
import {
  linkFilesToSubmission,
  cleanupSourceObjects,
} from "@/features/files/helpers/linkFilesToSubmission.js";

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
 *    - files are not expected to be provided
 *    - Updates the existing organization data in place
 *    - No new submission is created
 *    - Changes remain as draft until explicitly submitted
 *
 * 3. has an APPROVED organization data (accredited):
 *    - Creates NEW organization data record with changes
 *    - Automatically creates and submits for review (PENDING status)
 *    - Original approved data remains unchanged
 *    - New changes require admin approval before taking effect
 *    - files are expected to be provided
 *
 * 4. REJECTED (you only reach this point if you are in DRAFT and you have been rejected):
 *    - files are not expected to be provided
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
  body: Omit<UpdateOrganizationBody, "fileUuids">,
  storage: StorageAdapter,
  fileUuids?: string[]
): Promise<UpdateOrganizationResponse> => {
  const organization = await prismaClient.organization.findUnique({
    where: {
      id: BigInt(organizationId),
    },
  });

  if (!organization) {
    throw new OrganizationNotFoundError(organizationId);
  }

  const result = await prismaClient.$transaction(async (tx) => {
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
      if (fileUuids?.length) {
        throw new FileAttachmentsNotSupportedError("draft");
      }
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

    const isAccredited = await hasApprovedOrganizationData(tx, organizationId);
    if (isAccredited) {
      if (!fileUuids?.length) {
        throw new FileAttachmentsRequiredError();
      }

      const newOrganizationData = await createOrganizationData(
        tx,
        organizationId,
        userId,
        body
      );
      const submission = await createOrganizationDataSubmission(
        tx,
        newOrganizationData.id.toString(),
        userId
      );
      const { sourceCleanup } = await linkFilesToSubmission(
        tx,
        submission.id,
        fileUuids,
        storage
      );
      await cleanupSourceObjects(sourceCleanup);
      return { id: organization.id.toString() };
    }

    const lastRejectedOrganizationData = await getLastReviewedOrganizationData(
      tx,
      organizationId
    );

    if (lastRejectedOrganizationData) {
      if (fileUuids?.length) {
        throw new FileAttachmentsNotSupportedError("rejected");
      }
      await createOrganizationData(tx, organizationId, userId, body);
      return {
        id: organization.id.toString(),
      };
    }

    throw new OrganizationDataNotFoundError(organizationId);
  });

  return { id: result.id };
};
