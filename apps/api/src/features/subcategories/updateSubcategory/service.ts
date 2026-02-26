import { type PrismaClient, Prisma } from "@repo/database";
import {
  SubCategoryStatus,
  User,
  type UpdateSubcategoryRequest,
  type UpdateSubcategoryResponse,
} from "@repo/types";
import { mapSubcategoryToResponse } from "../mappers.js";
import {
  SubcategoryNotFoundError,
  SubcategoryNameAlreadyExistsError,
  getDuplicatedFieldsFromP2002Error,
} from "../errors.js";

export const updateSubcategoryService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateSubcategoryRequest,
  user: User | null
): Promise<UpdateSubcategoryResponse> => {
  const targetSubcategory = await prismaClient.subcategory.findFirst({
    where: {
      id: BigInt(id),
      status: { not: SubCategoryStatus.DELETED },
    },
    select: { status: true },
  });

  if (!targetSubcategory) {
    throw new SubcategoryNotFoundError();
  }

  try {
    const result = await prismaClient.$transaction(async (tx) => {
      // Build update data dynamically based on provided fields
      const updateData: Prisma.SubcategoryUncheckedUpdateInput = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.examples !== undefined) updateData.examples = data.examples;

      if (Object.keys(updateData).length > 0) {
        updateData.updatedById = user ? BigInt(user.id) : null;
      }

      const subcategory = await tx.subcategory.update({
        where: { id: BigInt(id) },
        data: updateData,
        include: {
          category: {
            select: { methodologyVersionId: true },
          },
        },
      });

      // Sync measurement unit associations if provided
      if (data.measurementUnitIds !== undefined) {
        await tx.subcategoryMeasurementUnit.deleteMany({
          where: { subcategoryId: BigInt(id) },
        });

        if (data.measurementUnitIds.length > 0) {
          await tx.subcategoryMeasurementUnit.createMany({
            data: data.measurementUnitIds.map((unitId) => ({
              subcategoryId: BigInt(id),
              measurementUnitId: BigInt(unitId),
            })),
          });
        }
      }

      // Fetch current measurement unit IDs
      const units = await tx.subcategoryMeasurementUnit.findMany({
        where: { subcategoryId: BigInt(id) },
        select: { measurementUnitId: true },
      });

      return {
        subcategory,
        measurementUnitIds: units.map((u) => u.measurementUnitId),
      };
    });

    return mapSubcategoryToResponse(
      result.subcategory,
      result.measurementUnitIds
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (duplicatedFields.includes("name")) {
          throw new SubcategoryNameAlreadyExistsError();
        }
      }
    }
    throw error;
  }
};
