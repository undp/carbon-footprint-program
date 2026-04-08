import { type PrismaClient, InventoryStatus } from "@repo/database";
import type { User } from "@repo/types";
import {
  ReductionProjectNotDeletableError,
  ReductionProjectNotFoundError,
} from "../errors.js";
import {
  reductionProjectWithSubmissionsMinimalSelect,
  calculateReductionProjectDisplayStatus,
} from "../helpers.js";
import { isReductionProjectDeletable } from "@repo/utils";

export const deleteReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<void> => {
  await prismaClient.$transaction(async (tx) => {
    const project = await tx.reductionProject.findUnique({
      where: { id: BigInt(id) },
      select: {
        ...reductionProjectWithSubmissionsMinimalSelect,
      },
    });

    if (!project) {
      throw new ReductionProjectNotFoundError(id);
    }

    const displayStatus = calculateReductionProjectDisplayStatus(project);
    if (!isReductionProjectDeletable(displayStatus)) {
      throw new ReductionProjectNotDeletableError(id, displayStatus);
    }

    await tx.reductionProject.update({
      where: { id: BigInt(id) },
      data: {
        status: InventoryStatus.DELETED,
        updatedById: user ? BigInt(user.id) : null,
      },
    });
  });
};
