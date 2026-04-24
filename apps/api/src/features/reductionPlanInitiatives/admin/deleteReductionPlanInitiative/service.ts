import {
  ReductionPlanInitiativeStatus,
  type PrismaClient,
} from "@repo/database";
import type { DeleteReductionPlanInitiativeResponse, User } from "@repo/types";
import { ReductionPlanInitiativeNotFoundError } from "../errors.js";

export const deleteReductionPlanInitiativeService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<DeleteReductionPlanInitiativeResponse> => {
  const reductionPlanInitiativeId = BigInt(id);

  const result = await prismaClient.reductionPlanInitiative.updateMany({
    where: {
      id: reductionPlanInitiativeId,
      status: ReductionPlanInitiativeStatus.ACTIVE,
    },
    data: {
      status: ReductionPlanInitiativeStatus.DELETED,
      updatedById: user ? BigInt(user.id) : null,
    },
  });

  if (result.count === 0) {
    throw new ReductionPlanInitiativeNotFoundError(id);
  }

  return {};
};
