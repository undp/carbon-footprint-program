import { type PrismaClient } from "@repo/database";
import { ReductionProjectStatus, type User } from "@repo/types";
import { isReductionProjectDeletable } from "@repo/utils";
import {
  ReductionProjectNotDeletableError,
  ReductionProjectNotFoundError,
} from "../errors.js";
import {
  calculateReductionProjectDisplayStatus,
  reductionProjectWithSubmissionsMinimalSelect,
} from "../helpers.js";

/**
 * Soft-deletes a reduction project, allowed only while DRAFT. Mirrors the
 * canonical `deleteCarbonInventory` (read-then-write, guarded by
 * `isReductionProjectDeletable`). The not-found branch is defensive: the
 * route's `reductionProject` auth filters `status: ACTIVE`, so a deleted or
 * unknown project already resolves to 403 there.
 */
export const deleteReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<void> => {
  const project = await prismaClient.reductionProject.findUnique({
    where: { id: BigInt(id) },
    select: { ...reductionProjectWithSubmissionsMinimalSelect },
  });

  if (!project) {
    throw new ReductionProjectNotFoundError(id);
  }

  const displayStatus = calculateReductionProjectDisplayStatus(project);
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
