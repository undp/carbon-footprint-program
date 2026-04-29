import {
  Prisma,
  ReductionPlanInitiativeStatus,
  SubcategoryStatus,
  type PrismaClient,
} from "@repo/database";
import type {
  CreateReductionPlanInitiativeRequest,
  CreateReductionPlanInitiativeResponse,
  User,
} from "@repo/types";
import { getDuplicatedFieldsFromP2002Error } from "@/errors/index.js";
import {
  ReductionPlanInitiativeTitleAlreadyExistsError,
  SubcategoryNotFoundForReductionPlanInitiativeError,
} from "../errors.js";

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

  try {
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
      if (duplicatedFields.includes("title")) {
        throw new ReductionPlanInitiativeTitleAlreadyExistsError();
      }
    }
    throw error;
  }
};
