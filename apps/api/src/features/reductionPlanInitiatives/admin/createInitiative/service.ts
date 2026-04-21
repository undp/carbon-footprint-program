import {
  ReductionPlanInitiativeStatus,
  SubcategoryStatus,
  type PrismaClient,
} from "@repo/database";
import type {
  CreateInitiativeRequest,
  CreateInitiativeResponse,
  User,
} from "@repo/types";
import { SubcategoryNotFoundForInitiativeError } from "../errors.js";

export const createInitiativeService = async (
  prismaClient: PrismaClient,
  data: CreateInitiativeRequest,
  user: User | null
): Promise<CreateInitiativeResponse> => {
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

  const createdById = user ? BigInt(user.id) : null;

  const initiative = await prismaClient.reductionPlanInitiative.create({
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

  return { id: initiative.id.toString() };
};
