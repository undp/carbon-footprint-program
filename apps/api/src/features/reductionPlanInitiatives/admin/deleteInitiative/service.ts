import {
  ReductionPlanInitiativeStatus,
  type PrismaClient,
} from "@repo/database";
import type { DeleteInitiativeResponse, User } from "@repo/types";
import { ReductionPlanInitiativeNotFoundError } from "../errors.js";

export const deleteInitiativeService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<DeleteInitiativeResponse> => {
  const initiativeId = BigInt(id);

  const existing = await prismaClient.reductionPlanInitiative.findUnique({
    where: { id: initiativeId },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new ReductionPlanInitiativeNotFoundError(id);
  }

  if (existing.status === ReductionPlanInitiativeStatus.DELETED) {
    return {};
  }

  await prismaClient.reductionPlanInitiative.update({
    where: { id: initiativeId },
    data: {
      status: ReductionPlanInitiativeStatus.DELETED,
      updatedById: user ? BigInt(user.id) : null,
    },
  });

  return {};
};
