import { type PrismaClient, type Prisma } from "@repo/database";
import {
  CategoryStatus,
  SubcategoryStatus,
  User,
  type UpdateSubcategoryRequest,
  type UpdateSubcategoryResponse,
} from "@repo/types";
import {
  SubcategoryNotFoundError,
  CategoryNotFoundForSubcategoryError,
  CategoryFromDifferentMethodologyError,
} from "../errors.js";
import {
  getNextSubcategoryPosition,
  lockCategory,
  repackSubcategoryPositions,
  rethrowSubcategoryUniqueViolation,
  type LockedCategory,
} from "../helpers.js";
import { mapSubcategoryWithCategoryToResponse } from "../mappers.js";
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
          position: true,
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
      // The position the row frees in its old category, set only on a move: the
      // source sequence has to be re-packed after the write below.
      let freedPosition: number | undefined;

      // Validate the target category belongs to the same methodology.
      if (data.categoryId !== undefined) {
        const newCategoryId = BigInt(data.categoryId);
        const isMove = newCategoryId !== targetSubcategory.categoryId;

        // Locked before the status is read, for the same reason as
        // createSubcategory. See lockCategory.
        //
        // A move locks both parents — the destination to append under, the
        // source to re-pack under — in id order: this is the only path that
        // holds two category locks, and two moves crossing between the same
        // pair (A -> B and B -> A) would deadlock if each took its own
        // destination first.
        const categoryIdsToLock = isMove
          ? [targetSubcategory.categoryId, newCategoryId].sort((a, b) =>
              a < b ? -1 : 1
            )
          : [newCategoryId];

        const lockedCategories = new Map<bigint, LockedCategory | null>();
        for (const categoryId of categoryIdsToLock) {
          lockedCategories.set(categoryId, await lockCategory(tx, categoryId));
        }

        const newCategory = lockedCategories.get(newCategoryId) ?? null;

        if (!newCategory || newCategory.status !== CategoryStatus.ACTIVE) {
          throw new CategoryNotFoundForSubcategoryError();
        }

        if (
          newCategory.methodologyVersionId !==
          targetSubcategory.category.methodologyVersionId
        ) {
          throw new CategoryFromDifferentMethodologyError();
        }

        if (isMove) {
          newPosition = await getNextSubcategoryPosition(tx, newCategoryId);
          freedPosition = targetSubcategory.position;
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

      // A move leaves a hole behind it in the old category, and the live
      // sequence has to stay contiguous the same way deleteSubcategory keeps it
      // (see repackSubcategoryPositions). It runs after the write above so the
      // row is already out of the way, and under the source category lock taken
      // with the destination one.
      if (freedPosition !== undefined) {
        await repackSubcategoryPositions(
          tx,
          targetSubcategory.categoryId,
          freedPosition
        );
      }

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

      return mapSubcategoryWithCategoryToResponse(
        subcategory,
        subcategory.subcategoryMeasurementUnits.map(
          ({ measurementUnit }) => measurementUnit
        )
      );
    });

    return result;
  } catch (error) {
    rethrowSubcategoryUniqueViolation(error);
  }
};
