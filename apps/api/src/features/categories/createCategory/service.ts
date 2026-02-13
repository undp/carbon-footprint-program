import { type PrismaClient, Prisma } from "@repo/database";
import {
  CategoryStatus,
  MethodologyVersionStatus,
  type CreateCategoryRequest,
  type CreateCategoryResponse,
} from "@repo/types";
import { mapCategoryToResponse } from "../mappers.js";
import {
  CategoryNameAlreadyExistsError,
  CategoryPositionAlreadyExistsError,
  MethodologyVersionNotFoundForCategoryError,
  getDuplicatedFieldsFromP2002Error,
} from "../errors.js";

export const createCategoryService = async (
  prismaClient: PrismaClient,
  data: CreateCategoryRequest
): Promise<CreateCategoryResponse> => {
  // Validate methodology version exists and is not deleted
  const methodologyVersion = await prismaClient.methodologyVersion.findUnique({
    where: { id: BigInt(data.methodologyVersionId) },
    select: { id: true, status: true },
  });

  if (
    !methodologyVersion ||
    methodologyVersion.status === MethodologyVersionStatus.DELETED
  ) {
    throw new MethodologyVersionNotFoundForCategoryError();
  }

  try {
    const category = await prismaClient.category.create({
      data: {
        methodologyVersionId: BigInt(data.methodologyVersionId),
        name: data.name,
        icon: data.icon,
        color: data.color,
        synonyms: data.synonyms,
        description: data.description,
        examples: data.examples ?? null,
        position: data.position,
        status: CategoryStatus.ACTIVE,
        createdById: null, // TODO: Add from authenticated user
        updatedById: null,
      },
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
