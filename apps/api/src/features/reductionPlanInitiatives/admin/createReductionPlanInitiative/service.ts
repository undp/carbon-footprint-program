import {
  ReductionPlanInitiativeStatus,
  SubcategoryStatus,
  type PrismaClient,
} from "@repo/database";
import type {
  CreateReductionPlanInitiativeRequest,
  CreateReductionPlanInitiativeResponse,
  User,
} from "@repo/types";
import { SubcategoryNotFoundForReductionPlanInitiativeError } from "../errors.js";

export const createReductionPlanInitiativeService = async (
  prismaClient: PrismaClient,
  data: CreateReductionPlanInitiativeRequest,
  user: User | null
): Promise<CreateReductionPlanInitiativeResponse> => {
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

  const createdById = user ? BigInt(user.id) : null;

  const reductionPlanInitiative =
    await prismaClient.reductionPlanInitiative.create({
      data: {
        title: data.title,
        description: data.description,
        subcategoryId: subcategory.id,
        dimensionValue1Id: null,
        dimensionValue2Id: null,
        status: ReductionPlanInitiativeStatus.ACTIVE,
        createdById,
        updatedAt: null,
      },
      select: { id: true },
    });

  return { id: reductionPlanInitiative.id.toString() };
};
