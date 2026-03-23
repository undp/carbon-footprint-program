import type { PrismaClient } from "@repo/database";
import type { ObjectReductionProjectResponse, User } from "@repo/types";
import { mapReductionProjectWithoutFilesOrReports } from "../mappers.js";
import {
  ReductionProjectNotFoundError,
  InvalidStatusTransitionError,
} from "../errors.js";

export const objectReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<ObjectReductionProjectResponse> => {
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
    throw new InvalidStatusTransitionError(id, project.status, "OBJECTED");
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
          status: "OBJECTED",
          reviewerId: user ? BigInt(user.id) : null,
          updatedById: user ? BigInt(user.id) : null,
        },
      });
    }

    return tx.reductionProject.update({
      where: { id: BigInt(id) },
      data: {
        status: "OBJECTED",
        updatedById: user ? BigInt(user.id) : null,
      },
    });
  });

  return mapReductionProjectWithoutFilesOrReports(updated);
};
