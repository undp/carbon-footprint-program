import type { PrismaClient } from "@repo/database";
import type {
  RequestOrganizationAccreditationResponse,
  User,
} from "@repo/types";
import type { StorageAdapter } from "@repo/storage";
import {
  OrganizationDataStatus,
  SubmissionStatus,
  SubmissionType,
} from "@repo/database";
import {
  linkFilesToSubmission,
  cleanupSourceObjects,
} from "@/features/files/helpers/linkFilesToSubmission.js";
import {
  OrganizationDataNotFoundError,
  OrganizationNotFoundError,
  SubmissionAlreadyExistsError,
  OrganizationAlreadyAccreditedError,
  FileAttachmentsRequiredError,
} from "../../errors.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  getLastReviewedOrganizationData,
  cloneOrganizationData,
  hasApprovedOrganizationData,
} from "../../helpers.js";

export const requestOrganizationAccreditationService = async (
  prismaClient: PrismaClient,
  organizationId: string,
  user: User | null,
  storage: StorageAdapter,
  fileUuids?: string[]
): Promise<RequestOrganizationAccreditationResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  if (!fileUuids?.length) {
    throw new FileAttachmentsRequiredError();
  }

  const userId = user.id;
  const organization = await prismaClient.organization.findUnique({
    where: {
      id: BigInt(organizationId),
    },
  });

  if (!organization) {
    throw new OrganizationNotFoundError(organizationId);
  }

  // this endpoint is not expected to be called if the organization is already accredited
  const isAccredited = await hasApprovedOrganizationData(
    prismaClient,
    organizationId
  );
  if (isAccredited) {
    throw new OrganizationAlreadyAccreditedError(organizationId);
  }

  const result = await prismaClient.$transaction(async (tx) => {
    // Find ACTIVE organization data that is a Draft (no submission linked)
    const activeData = await tx.organizationData.findFirst({
      where: {
        organizationId: BigInt(organizationId),
        status: OrganizationDataStatus.ACTIVE,
        submission: null,
      },
    });

    const reviewedData = await getLastReviewedOrganizationData(
      tx,
      organizationId
    );

    let resolvedActiveData = activeData;
    if (!resolvedActiveData && reviewedData) {
      // Files provided: clone reviewed data into a new draft so the user can re-submit
      resolvedActiveData = await cloneOrganizationData(
        tx,
        reviewedData,
        userId
      );
    }

    if (!resolvedActiveData) {
      throw new OrganizationDataNotFoundError(organizationId);
    }

    // Check if submission already exists for this org data (safety guard)
    const hasSubmission = await tx.submission.findFirst({
      where: {
        type: SubmissionType.ORGANIZATION_ACCREDITATION,
        subject: {
          organizationData: { organizationDataId: resolvedActiveData.id },
        },
      },
      select: { id: true },
    });

    if (hasSubmission) {
      throw new SubmissionAlreadyExistsError(organizationId);
    }

    // Mark any rejected ACTIVE data as OUTDATED (atomically with the submission)
    await tx.organizationData.updateMany({
      where: {
        organizationId: BigInt(organizationId),
        status: OrganizationDataStatus.ACTIVE,
        submission: {
          subject: {
            submissions: {
              some: { status: SubmissionStatus.REJECTED },
            },
          },
        },
      },
      data: { status: OrganizationDataStatus.OUTDATED },
    });

    // Create submission chain (Subject → Link → Submission)
    // 1. Create submission subject
    const subject = await tx.submissionSubject.create({
      data: {
        createdById: BigInt(userId),
      },
    });

    // 2. Link subject to organization data
    await tx.submissionSubjectOrganizationData.create({
      data: {
        subjectId: subject.id,
        organizationDataId: resolvedActiveData.id,
      },
    });

    // 3. Create submission
    const submission = await tx.submission.create({
      data: {
        type: SubmissionType.ORGANIZATION_ACCREDITATION,
        subjectId: subject.id,
        status: SubmissionStatus.PENDING,
        createdById: BigInt(userId),
        updatedById: BigInt(userId),
      },
    });

    // 4. Create SubmissionFile records. NOTE: the object copy/cleanup currently
    // runs inside this transaction, holding it open across network-bound storage
    // I/O. Tracked for extraction in
    // https://github.com/undp/carbon-footprint-program/issues/387
    const fileMetadata = await linkFilesToSubmission(
      tx,
      submission.id,
      fileUuids,
      storage
    );
    await cleanupSourceObjects(fileMetadata.sourceCleanup);

    return { submissionId: submission.id.toString() };
  });

  return { submissionId: result.submissionId };
};
