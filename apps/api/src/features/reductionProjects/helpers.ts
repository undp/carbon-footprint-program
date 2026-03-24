import type { PrismaClient } from "@repo/database";
import type { ReductionProjectStatus, SubmissionStatus } from "@repo/database/enums";
import type { User } from "@repo/types";
import { ReductionProjectNotFoundError, InvalidStatusTransitionError } from "./errors.js";
import { mapReductionProjectWithoutFilesOrReports } from "./mappers.js";

/**
 * Shared helper for approve / reject / object transitions.
 * All three operations follow the same pattern:
 *   1. Load project with its pending submission
 *   2. Validate current status is IN_REVIEW
 *   3. In a transaction: update the pending submission + update the project status
 */
export async function updateReviewedProjectStatus(
  prismaClient: PrismaClient,
  id: string,
  newProjectStatus: ReductionProjectStatus,
  submissionUpdate: {
    status: SubmissionStatus;
    reviewComments?: string | null;
  },
  user: User | null
) {
  const project = await prismaClient.reductionProject.findUnique({
    where: { id: BigInt(id) },
    include: {
      submission: {
        include: {
          subject: { include: { submissions: true } },
        },
      },
    },
  });

  if (!project) {
    throw new ReductionProjectNotFoundError(id);
  }

  if (project.status !== "IN_REVIEW") {
    throw new InvalidStatusTransitionError(id, project.status, newProjectStatus);
  }

  const pendingSubmission = project.submission?.subject.submissions.find(
    (s) => s.status === "PENDING"
  );

  const updated = await prismaClient.$transaction(async (tx) => {
    if (pendingSubmission) {
      await tx.submission.update({
        where: { id: pendingSubmission.id },
        data: {
          status: submissionUpdate.status,
          reviewerId: user ? BigInt(user.id) : null,
          reviewComments: submissionUpdate.reviewComments ?? null,
          updatedById: user ? BigInt(user.id) : null,
        },
      });
    }

    return tx.reductionProject.update({
      where: { id: BigInt(id) },
      data: {
        status: newProjectStatus,
        updatedById: user ? BigInt(user.id) : null,
      },
    });
  });

  return mapReductionProjectWithoutFilesOrReports(updated);
}
