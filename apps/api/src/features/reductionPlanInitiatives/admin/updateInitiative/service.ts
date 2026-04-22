import {
  Prisma,
  ReductionPlanInitiativeStatus,
  SubcategoryStatus,
  type PrismaClient,
} from "@repo/database";
import type {
  UpdateInitiativeRequest,
  UpdateInitiativeResponse,
  User,
} from "@repo/types";
import {
  ReductionPlanInitiativeNotFoundError,
  SubcategoryNotFoundForInitiativeError,
} from "../errors.js";

export const updateInitiativeService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateInitiativeRequest,
  user: User | null
): Promise<UpdateInitiativeResponse> => {
  const initiativeId = BigInt(id);

  if (data.subcategoryId !== undefined) {
    const subcategory = await prismaClient.subcategory.findFirst({
      where: {
        id: BigInt(data.subcategoryId),
        status: SubcategoryStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!subcategory) {
      throw new SubcategoryNotFoundForInitiativeError(data.subcategoryId);
    }
  }

  const updateData: Prisma.ReductionPlanInitiativeUncheckedUpdateManyInput = {
    updatedById: user ? BigInt(user.id) : null,
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.subcategoryId !== undefined) {
    updateData.subcategoryId = BigInt(data.subcategoryId);
  }

  const result = await prismaClient.reductionPlanInitiative.updateMany({
    where: {
      id: initiativeId,
      status: ReductionPlanInitiativeStatus.ACTIVE,
    },
    data: updateData,
  });

  if (result.count === 0) {
    throw new ReductionPlanInitiativeNotFoundError(id);
  }

  return {};
};
