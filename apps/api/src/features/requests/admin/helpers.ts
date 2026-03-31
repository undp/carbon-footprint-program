import { SubmissionFileType, SubmissionStatus } from "@repo/database";
import type { PrismaClient, Prisma } from "@repo/database";
import type { User } from "@repo/types";
import { keyBy, uniq } from "lodash-es";
import { MissingFilesError } from "@/features/files/errors.js";
import {
  InvalidSubmissionFileGroupsError,
  SubmissionUpdateError,
} from "../errors.js";

type SubmissionTargetStatus =
  | typeof SubmissionStatus.APPROVED
  | typeof SubmissionStatus.REJECTED
  | typeof SubmissionStatus.REVIEWED;

export const updatePendingSubmissionStatus = async (
  prismaClient: PrismaClient | Prisma.TransactionClient,
  submissionId: string,
  targetStatus: SubmissionTargetStatus,
  userId: User["id"],
  additionalData: Prisma.SubmissionUncheckedUpdateInput = {}
): Promise<void> => {
  const result = await prismaClient.submission.updateMany({
    where: {
      id: BigInt(submissionId),
      status: SubmissionStatus.PENDING,
    },
    data: {
      status: targetStatus,
      reviewerId: BigInt(userId),
      reviewedAt: new Date(),
      updatedById: BigInt(userId),
      ...additionalData,
    },
  });

  if (result.count === 0) {
    throw new SubmissionUpdateError(submissionId);
  }
};

type SubmissionFileGroup = {
  uuids?: string[];
  type: SubmissionFileType;
};

/**
 * Resolves grouped file UUIDs into SubmissionFile records for a submission.
 *
 * Deduplicates UUIDs within each group, validates that at least one attachable
 * group was provided, and fails if any referenced file does not exist.
 *
 * @param prismaClient - Prisma transaction client.
 * @param submissionId - The submission that will receive the file attachments.
 * @param fileGroups - File UUID groups mapped to their target SubmissionFileType.
 *
 * @throws {InvalidSubmissionFileGroupsError} If no attachable file groups are provided.
 * @throws {MissingFilesError} If any referenced file UUID does not exist.
 */
export const attachFilesToSubmission = async (
  prismaClient: Prisma.TransactionClient,
  submissionId: bigint,
  fileGroups: SubmissionFileGroup[]
): Promise<void> => {
  const normalizedGroups = fileGroups
    .map(({ uuids, type }) => ({
      type,
      uuids: uniq(uuids ?? []),
    }))
    .filter(({ uuids }) => uuids.length > 0);

  if (!normalizedGroups.length) {
    throw new InvalidSubmissionFileGroupsError();
  }

  const allUuids = uniq(normalizedGroups.flatMap(({ uuids }) => uuids));

  const files = await prismaClient.file.findMany({
    where: { uuid: { in: allUuids } },
    select: { id: true, uuid: true },
  });

  if (files.length !== allUuids.length) {
    const foundUuids = new Set(files.map((file) => file.uuid));
    const missingUuids = allUuids.filter((uuid) => !foundUuids.has(uuid));
    throw new MissingFilesError(missingUuids.join(", "));
  }

  const filesByUuid = keyBy(files, "uuid");

  const data = normalizedGroups.flatMap(({ uuids, type }) =>
    uuids.flatMap((uuid) => {
      const file = filesByUuid[uuid];
      return file
        ? [
            {
              fileId: file.id,
              submissionId,
              type,
            },
          ]
        : [];
    })
  );

  await prismaClient.submissionFile.createMany({ data });
};
