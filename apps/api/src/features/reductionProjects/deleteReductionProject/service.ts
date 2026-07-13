import { type PrismaClient } from "@repo/database";
import { ReductionProjectStatus, type User } from "@repo/types";
import { ReductionProjectNotDeletableError } from "../errors.js";

/**
 * Soft-deletes a reduction project. Only DRAFTs are deletable, and a DRAFT is
 * exactly an ACTIVE project that was never submitted (no submission subject),
 * so the guard lives entirely in the `where`: a conditional update that matches
 * nothing means the project isn't a deletable DRAFT.
 */
export const deleteReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<void> => {
  const { count } = await prismaClient.reductionProject.updateMany({
    where: {
      id: BigInt(id),
      status: ReductionProjectStatus.ACTIVE,
      submission: { is: null },
    },
    data: {
      status: ReductionProjectStatus.DELETED,
      updatedById: user ? BigInt(user.id) : null,
    },
  });

  if (count === 0) {
    throw new ReductionProjectNotDeletableError(id);
  }
};
