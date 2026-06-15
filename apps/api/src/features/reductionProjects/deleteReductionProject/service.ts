import { type PrismaClient } from "@repo/database";
import type { User } from "@repo/types";
import { ReductionProjectStatus } from "@repo/types";
import { isReductionProjectDeletable } from "@repo/utils";
import {
  ReductionProjectNotDeletableError,
  ReductionProjectNotFoundError,
} from "../errors.js";
import {
  calculateReductionProjectDisplayStatus,
  reductionProjectWithSubmissionsMinimalSelect,
} from "../helpers.js";

export const deleteReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<void> => {
  const project = await prismaClient.reductionProject.findFirst({
    where: { id: BigInt(id), status: ReductionProjectStatus.ACTIVE },
    select: { ...reductionProjectWithSubmissionsMinimalSelect },
  });

  if (!project) {
    throw new ReductionProjectNotFoundError(id);
  }

  const displayStatus = calculateReductionProjectDisplayStatus(project);

  // Only a DRAFT (no verification submission) may be soft-deleted.
  if (!isReductionProjectDeletable(displayStatus)) {
    throw new ReductionProjectNotDeletableError(id, displayStatus);
  }

  await prismaClient.reductionProject.update({
    where: { id: BigInt(id) },
    data: {
      status: ReductionProjectStatus.DELETED,
      updatedById: user ? BigInt(user.id) : null,
    },
  });
};
