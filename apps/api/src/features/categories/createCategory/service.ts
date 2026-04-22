import { type PrismaClient, Prisma } from "@repo/database";
import {
  CategoryStatus,
  MethodologyVersionStatus,
  User,
  type CreateCategoryRequest,
  type CreateCategoryResponse,
} from "@repo/types";
import { mapCategoryToResponse } from "../mappers.js";
import {
  CategoryNameAlreadyExistsError,
  CategoryPositionAlreadyExistsError,
  MethodologyVersionNotFoundForCategoryError,
} from "../errors.js";
import { getDuplicatedFieldsFromP2002Error } from "@/errors/index.js";

export const createCategoryService = async (
  prismaClient: PrismaClient,
  data: CreateCategoryRequest,
  user: User | null
): Promise<CreateCategoryResponse> => {
  try {
    const category = await prismaClient.$transaction(async (tx) => {
      // Validate methodology version exists and is not deleted
      const methodologyVersion = await tx.methodologyVersion.findUnique({
        where: {
          id: BigInt(data.methodologyVersionId),
          status: { not: MethodologyVersionStatus.DELETED },
        },
        select: { id: true, status: true },
      });

      if (!methodologyVersion) {
        throw new MethodologyVersionNotFoundForCategoryError();
      }

      return tx.category.create({
        data: {
          methodologyVersionId: BigInt(data.methodologyVersionId),
          name: data.name,
          icon: data.icon,
          color: data.color,
          synonyms: data.synonyms,
          description: data.description,
          explanation: data.explanation ?? null,
          position: data.position,
          status: CategoryStatus.ACTIVE,
          createdById: user ? BigInt(user.id) : null,
          updatedAt: null,
        },
      });
    });
    return mapCategoryToResponse(category);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (duplicatedFields.includes("name")) {
          throw new CategoryNameAlreadyExistsError();
        }
        if (duplicatedFields.includes("position")) {
          throw new CategoryPositionAlreadyExistsError();
        }
      }
    }
    throw error;
  }
};
