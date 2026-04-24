import {
  Prisma,
  ReductionPlanInitiativeStatus,
  SubcategoryStatus,
  type PrismaClient,
} from "@repo/database";
import type {
  UpdateReductionPlanInitiativeRequest,
  UpdateReductionPlanInitiativeResponse,
  User,
} from "@repo/types";
import {
  ReductionPlanInitiativeNotFoundError,
  SubcategoryNotFoundForReductionPlanInitiativeError,
} from "../errors.js";

export const updateReductionPlanInitiativeService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateReductionPlanInitiativeRequest,
  user: User | null
): Promise<UpdateReductionPlanInitiativeResponse> => {
  const reductionPlanInitiativeId = BigInt(id);

  if (data.subcategoryId !== undefined) {
    const subcategory = await prismaClient.subcategory.findFirst({
      where: {
        id: BigInt(data.subcategoryId),
        status: SubcategoryStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!subcategory) {
      throw new SubcategoryNotFoundForReductionPlanInitiativeError(
        data.subcategoryId
      );
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
      id: reductionPlanInitiativeId,
      status: ReductionPlanInitiativeStatus.ACTIVE,
    },
    data: updateData,
  });

  if (result.count === 0) {
    throw new ReductionPlanInitiativeNotFoundError(id);
  }

  return {};
};
