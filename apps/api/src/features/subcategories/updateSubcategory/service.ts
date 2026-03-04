import { type PrismaClient, Prisma } from "@repo/database";
import {
  SubCategoryStatus,
  User,
  type UpdateSubcategoryRequest,
  type UpdateSubcategoryResponse,
} from "@repo/types";
import {
  SubcategoryNotFoundError,
  SubcategoryNameAlreadyExistsError,
  getDuplicatedFieldsFromP2002Error,
} from "../errors.js";
import { UserNotFoundError } from "../../users/errors.js";

export const updateSubcategoryService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateSubcategoryRequest,
  user: User | null
): Promise<UpdateSubcategoryResponse> => {
  // TODO: remove this if when handlerFactory folder is improved
  if (!user) {
    throw new UserNotFoundError();
  }

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
      const updateData: Prisma.SubcategoryUncheckedUpdateInput = {
        // The schema validation enforced by the route ensures at least one of the update fields will be defined
        updatedById: BigInt(user.id),
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.examples !== undefined) updateData.examples = data.examples;

      await tx.subcategory.update({
        where: { id: BigInt(id) },
        data: updateData,
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

      const subcategory = await tx.subcategory.findUnique({
        where: { id: BigInt(id) },
        select: {
          id: true,
          name: true,
          icon: true,
          description: true,
          examples: true,
          category: {
            select: { id: true, name: true },
          },
          subcategoryMeasurementUnits: {
            select: {
              measurementUnit: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (!subcategory) {
        throw new SubcategoryNotFoundError();
      }

      return {
        id: subcategory.id.toString(),
        name: subcategory.name,
        icon: subcategory.icon,
        description: subcategory.description,
        examples: subcategory.examples,
        category: {
          id: subcategory.category.id.toString(),
          name: subcategory.category.name,
        },
        measurementUnits: subcategory.subcategoryMeasurementUnits.map(
          ({ measurementUnit }) => ({
            id: measurementUnit.id.toString(),
            name: measurementUnit.name,
          })
        ),
      };
    });

    return result;
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
