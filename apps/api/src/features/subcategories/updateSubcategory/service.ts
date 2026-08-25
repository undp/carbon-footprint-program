import { type PrismaClient, Prisma } from "@repo/database";
import {
  CategoryStatus,
  SubcategoryStatus,
  User,
  IconNameSchema,
  type UpdateSubcategoryRequest,
  type UpdateSubcategoryResponse,
} from "@repo/types";
import {
  SubcategoryNotFoundError,
  SubcategoryNameAlreadyExistsError,
  SubcategoryPositionAlreadyExistsError,
  CategoryNotFoundForSubcategoryError,
  CategoryFromDifferentMethodologyError,
} from "../errors.js";
import { getDuplicatedFieldsFromP2002Error } from "@/errors/index.js";
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

  try {
    const result = await prismaClient.$transaction(async (tx) => {
      const targetSubcategory = await tx.subcategory.findFirst({
        where: {
          id: BigInt(id),
          status: SubcategoryStatus.ACTIVE,
        },
        select: {
          status: true,
          categoryId: true,
          category: { select: { methodologyVersionId: true } },
        },
      });

      if (!targetSubcategory) {
        throw new SubcategoryNotFoundError(id);
      }

      // Position within the destination category, only when the subcategory
      // actually moves. Positions are unique per category, so keeping the old
      // one could collide with a subcategory already sitting there.
      let newPosition: number | undefined;

      // Validate the target category belongs to the same methodology.
      if (data.categoryId !== undefined) {
        const newCategory = await tx.category.findFirst({
          where: {
            id: BigInt(data.categoryId),
            status: CategoryStatus.ACTIVE,
          },
          select: { methodologyVersionId: true },
        });

        if (!newCategory) {
          throw new CategoryNotFoundForSubcategoryError();
        }

        if (
          newCategory.methodologyVersionId !==
          targetSubcategory.category.methodologyVersionId
        ) {
          throw new CategoryFromDifferentMethodologyError();
        }

        if (BigInt(data.categoryId) !== targetSubcategory.categoryId) {
          const { _max } = await tx.subcategory.aggregate({
            where: {
              categoryId: BigInt(data.categoryId),
              status: { not: SubcategoryStatus.DELETED },
            },
            _max: { position: true },
          });
          newPosition = (_max.position ?? 0) + 1;
        }
      }

      // Build update data dynamically based on provided fields
      const updateData: Prisma.SubcategoryUncheckedUpdateInput = {
        // The schema validation enforced by the route ensures at least one of the update fields will be defined
        updatedById: BigInt(user.id),
      };

      if (data.categoryId !== undefined)
        updateData.categoryId = BigInt(data.categoryId);
      // The moved subcategory is appended last in its destination category.
      if (newPosition !== undefined) updateData.position = newPosition;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.explanation !== undefined)
        updateData.explanation = data.explanation;

      await tx.subcategory.update({
        where: { id: BigInt(id) },
        data: updateData,
      });

      // Sync measurement unit associations if provided
      if (data.measurementUnitIds !== undefined) {
        await tx.subcategoryMeasurementUnit.deleteMany({
          where: { subcategoryId: BigInt(id) },
        });

        await tx.subcategoryMeasurementUnit.createMany({
          data: data.measurementUnitIds.map((unitId) => ({
            subcategoryId: BigInt(id),
            measurementUnitId: BigInt(unitId),
          })),
        });
      }

      const subcategory = await tx.subcategory.findUnique({
        where: { id: BigInt(id) },
        select: {
          id: true,
          name: true,
          icon: true,
          description: true,
          explanation: true,
          position: true,
          category: {
            select: { id: true, name: true, color: true },
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
        icon: IconNameSchema.parse(subcategory.icon),
        description: subcategory.description,
        explanation: subcategory.explanation,
        position: subcategory.position,
        category: {
          id: subcategory.category.id.toString(),
          name: subcategory.category.name,
          color: subcategory.category.color,
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
        // A concurrent move/create into the same destination category can claim
        // the computed position first; surface it as a conflict, not a 500.
        if (duplicatedFields.includes("position")) {
          throw new SubcategoryPositionAlreadyExistsError();
        }
      }
    }
    throw error;
  }
};
