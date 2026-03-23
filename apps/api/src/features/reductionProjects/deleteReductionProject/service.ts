import type { PrismaClient } from "@repo/database";
import type { User } from "@repo/types";
import {
  ReductionProjectNotFoundError,
  InvalidStatusTransitionError,
} from "../errors.js";

export const deleteReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  _user: User | null
): Promise<void> => {
  const project = await prismaClient.reductionProject.findUnique({
    where: { id: BigInt(id) },
  });

  if (!project) {
    throw new ReductionProjectNotFoundError(id);
  }

  if (!["DRAFT", "OBJECTED"].includes(project.status)) {
    throw new InvalidStatusTransitionError(id, project.status, "DELETED");
  }

  await prismaClient.$transaction(async (tx) => {
    // Delete submission subject if exists (OBJECTED projects have one)
    await tx.submissionSubjectReductionProject.deleteMany({
      where: { reductionProjectId: BigInt(id) },
    });

    // Delete the project (cascade handles files + reports)
    await tx.reductionProject.delete({
      where: { id: BigInt(id) },
    });
  });
};
