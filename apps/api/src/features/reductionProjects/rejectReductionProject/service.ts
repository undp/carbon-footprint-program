import type { PrismaClient } from "@repo/database";
import type {
  RejectReductionProjectBody,
  RejectReductionProjectResponse,
  User,
} from "@repo/types";
import { mapReductionProjectWithoutFilesOrReports } from "../mappers.js";
import {
  ReductionProjectNotFoundError,
  InvalidStatusTransitionError,
} from "../errors.js";

export const rejectReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  data: RejectReductionProjectBody,
  user: User | null
): Promise<RejectReductionProjectResponse> => {
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
    throw new InvalidStatusTransitionError(id, project.status, "REJECTED");
  }

  const updated = await prismaClient.$transaction(async (tx) => {
    const pendingSubmission =
      project.submission?.subject.submissions.find(
        (s) => s.status === "PENDING"
      );

    if (pendingSubmission) {
      await tx.submission.update({
        where: { id: pendingSubmission.id },
        data: {
          status: "REJECTED",
          reviewerId: user ? BigInt(user.id) : null,
          reviewComments: data.reviewComments,
          updatedById: user ? BigInt(user.id) : null,
        },
      });
    }

    return tx.reductionProject.update({
      where: { id: BigInt(id) },
      data: {
        status: "REJECTED",
        updatedById: user ? BigInt(user.id) : null,
      },
    });
  });

  return mapReductionProjectWithoutFilesOrReports(updated);
};
