import { type PrismaClient, Prisma } from "@repo/database";
import {
  CategoryStatus,
  type UpdateCategoryRequest,
  type UpdateCategoryResponse,
} from "@repo/types";
import { mapCategoryToResponse } from "../mappers.js";
import {
  CategoryNotFoundError,
  CategoryIsDeletedError,
  CategoryNameAlreadyExistsError,
  CategoryPositionAlreadyExistsError,
  getDuplicatedFieldsFromP2002Error,
} from "../errors.js";

export const updateCategoryService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateCategoryRequest
): Promise<UpdateCategoryResponse> => {
  const targetCategory = await prismaClient.category.findUnique({
    where: { id: BigInt(id) },
    select: { status: true },
  });

  if (!targetCategory) {
    throw new CategoryNotFoundError();
  }

  if (targetCategory.status === CategoryStatus.DELETED) {
    throw new CategoryIsDeletedError();
  }

  // Build update data dynamically based on provided fields
  const updateData: Prisma.CategoryUncheckedUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.synonyms !== undefined) updateData.synonyms = data.synonyms;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.examples !== undefined) updateData.examples = data.examples;
  if (data.position !== undefined) updateData.position = data.position;

  if (Object.keys(updateData).length > 0) {
    updateData.updatedById = null; // TODO: Add from authenticated user
  }

  try {
    const category = await prismaClient.category.update({
      where: { id: BigInt(id) },
      data: updateData,
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
