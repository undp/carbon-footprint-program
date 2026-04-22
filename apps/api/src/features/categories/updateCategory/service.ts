import { type PrismaClient, Prisma } from "@repo/database";
import {
  CategoryStatus,
  User,
  type UpdateCategoryRequest,
  type UpdateCategoryResponse,
} from "@repo/types";
import { mapCategoryToResponse } from "../mappers.js";
import {
  CategoryNotFoundError,
  CategoryNameAlreadyExistsError,
  CategoryPositionAlreadyExistsError,
} from "../errors.js";
import { getDuplicatedFieldsFromP2002Error } from "@/errors/index.js";

export const updateCategoryService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateCategoryRequest,
  user: User | null
): Promise<UpdateCategoryResponse> => {
  // Build update data dynamically based on provided fields
  const updateData: Prisma.CategoryUncheckedUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.synonyms !== undefined) updateData.synonyms = data.synonyms;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.explanation !== undefined) updateData.explanation = data.explanation;
  if (data.position !== undefined) updateData.position = data.position;

  if (Object.keys(updateData).length > 0) {
    updateData.updatedById = user ? BigInt(user.id) : null;
  }

  try {
    const category = await prismaClient.$transaction(async (tx) => {
      const targetCategory = await tx.category.findFirst({
        where: {
          id: BigInt(id),
          status: { not: CategoryStatus.DELETED },
        },
        select: { status: true },
      });

      if (!targetCategory) {
        throw new CategoryNotFoundError();
      }

      return tx.category.update({
        where: { id: BigInt(id) },
        data: updateData,
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
