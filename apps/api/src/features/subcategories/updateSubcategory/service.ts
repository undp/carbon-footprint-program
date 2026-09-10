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
  SubcategoryConcurrentlyMovedError,
  CategoryNotFoundForSubcategoryError,
  CategoryFromDifferentMethodologyError,
} from "../errors.js";
import {
  getNextSubcategoryPosition,
  lockCategory,
  lockSubcategories,
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
      // Unlocked: it picks the category to lock and validates the methodology
      // version, which a category never changes. The position and the parent
      // the re-pack below is anchored on are read again from the locked row.
      const targetSubcategory = await tx.subcategory.findFirst({
        where: {
          id: BigInt(id),
          status: SubcategoryStatus.ACTIVE,
        },
        select: {
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
      // The slot the row frees in its old category, set only on a move and read
      // from the locked row: the source sequence has to be re-packed after the
      // write below.
      let freedSlot: { categoryId: bigint; position: number } | undefined;

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
          // The category locks above were taken on a parent read without one,
          // so the row itself is locked and re-read before its position is
          // used: a concurrent swap can have changed it, and a concurrent
          // update or a cascading category delete can have taken the row out of
          // the category being re-packed. Locked after the categories, in the
          // order swapSubcategoryPositions uses, so neither path deadlocks.
          const [lockedSubcategory] = await lockSubcategories(tx, [BigInt(id)]);

          if (
            !lockedSubcategory ||
            lockedSubcategory.status !== SubcategoryStatus.ACTIVE
          ) {
            throw new SubcategoryNotFoundError(id);
          }

          if (lockedSubcategory.categoryId !== targetSubcategory.categoryId) {
            throw new SubcategoryConcurrentlyMovedError(id);
          }

          newPosition = await getNextSubcategoryPosition(tx, newCategoryId);
          freedSlot = {
            categoryId: lockedSubcategory.categoryId,
            position: lockedSubcategory.position,
          };
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
      if (freedSlot) {
        await repackSubcategoryPositions(
          tx,
          freedSlot.categoryId,
          freedSlot.position
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
