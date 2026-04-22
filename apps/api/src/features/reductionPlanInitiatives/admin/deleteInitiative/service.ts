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

  const result = await prismaClient.reductionPlanInitiative.updateMany({
    where: {
      id: initiativeId,
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
