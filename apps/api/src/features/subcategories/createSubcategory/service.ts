import { type PrismaClient } from "@repo/database";
import {
  CategoryStatus,
  SubcategoryStatus,
  User,
  IconNameSchema,
  type CreateSubcategoryRequest,
  type CreateSubcategoryResponse,
} from "@repo/types";
import { CategoryNotFoundForSubcategoryError } from "../errors.js";
import {
  getNextSubcategoryPosition,
  lockCategory,
  rethrowSubcategoryUniqueViolation,
} from "../helpers.js";
import { UserNotFoundError } from "../../users/errors.js";

export const createSubcategoryService = async (
  prismaClient: PrismaClient,
  data: CreateSubcategoryRequest,
  user: User | null
): Promise<CreateSubcategoryResponse> => {
  // TODO: remove this if when handlerFactory folder is improved
  if (!user) {
    throw new UserNotFoundError();
  }

  try {
    const result = await prismaClient.$transaction(async (tx) => {
      const categoryId = BigInt(data.categoryId);

      // Locked before the status is read, so a concurrent soft-delete cannot
      // slip between the check and the insert. See lockCategory.
      const category = await lockCategory(tx, categoryId);

      if (!category || category.status !== CategoryStatus.ACTIVE) {
        throw new CategoryNotFoundForSubcategoryError();
      }

      const position = await getNextSubcategoryPosition(tx, categoryId);

      const newSubcategory = await tx.subcategory.create({
        data: {
          categoryId,
          name: data.name,
          icon: data.icon,
          description: data.description,
          explanation: data.explanation ?? null,
          position,
          status: SubcategoryStatus.ACTIVE,
          createdById: BigInt(user.id),
          updatedAt: null,
        },
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
        },
      });

      // Create measurement unit associations
      const uniqueMeasurementUnitIds = [...new Set(data.measurementUnitIds)];
      const newSubcategoryMeasurementUnits =
        await tx.subcategoryMeasurementUnit.createManyAndReturn({
          data: uniqueMeasurementUnitIds.map((unitId) => ({
            subcategoryId: newSubcategory.id,
            measurementUnitId: BigInt(unitId),
          })),
          select: {
            measurementUnit: {
              select: { id: true, name: true },
            },
          },
        });

      return {
        ...newSubcategory,
        id: newSubcategory.id.toString(),
        icon: IconNameSchema.parse(newSubcategory.icon),
        category: {
          id: newSubcategory.category.id.toString(),
          name: newSubcategory.category.name,
          color: newSubcategory.category.color,
        },
        measurementUnits: newSubcategoryMeasurementUnits.map((smu) => ({
          id: smu.measurementUnit.id.toString(),
          name: smu.measurementUnit.name,
        })),
      };
    });
    return result;
  } catch (error) {
    rethrowSubcategoryUniqueViolation(error);
  }
};
