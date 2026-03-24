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
  // Validate and delete inside the same transaction to avoid TOCTOU race
  await prismaClient.$transaction(async (tx) => {
    const project = await tx.reductionProject.findUnique({
      where: { id: BigInt(id) },
    });

    if (!project) {
      throw new ReductionProjectNotFoundError(id);
    }

    if (!["DRAFT", "OBJECTED"].includes(project.status)) {
      throw new InvalidStatusTransitionError(id, project.status, "DELETED");
    }

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
