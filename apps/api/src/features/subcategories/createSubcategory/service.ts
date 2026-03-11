import { type PrismaClient, Prisma } from "@repo/database";
import { omit } from "lodash-es";

import {
  CategoryStatus,
  SubcategoryStatus,
  User,
  type CreateSubcategoryRequest,
  type CreateSubcategoryResponse,
} from "@repo/types";
import {
  CategoryNotFoundForSubcategoryError,
  SubcategoryNameAlreadyExistsError,
  getDuplicatedFieldsFromP2002Error,
} from "../errors.js";
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

  // Validate category exists and is not deleted
  const category = await prismaClient.category.findFirst({
    where: {
      id: BigInt(data.categoryId),
      status: { not: CategoryStatus.DELETED },
    },
    select: { id: true, methodologyVersionId: true },
  });

  if (!category) {
    throw new CategoryNotFoundForSubcategoryError();
  }

  try {
    const result = await prismaClient.$transaction(async (tx) => {
      const newSubcategoryId = await tx.subcategory.create({
        data: {
          categoryId: BigInt(data.categoryId),
          name: data.name,
          icon: data.icon,
          description: data.description,
          examples: data.examples,
          status: SubcategoryStatus.ACTIVE,
          createdById: BigInt(user.id),
          updatedAt: null,
        },
        select: {
          id: true,
        },
      });

      // Create measurement unit associations
      const uniqueMeasurementUnitIds = [...new Set(data.measurementUnitIds)];
      if (uniqueMeasurementUnitIds.length > 0) {
        await tx.subcategoryMeasurementUnit.createMany({
          data: uniqueMeasurementUnitIds.map((unitId) => ({
            subcategoryId: newSubcategoryId.id,
            measurementUnitId: BigInt(unitId),
          })),
        });
      }

      const newSubCategory = await tx.subcategory.findUnique({
        where: { id: newSubcategoryId.id },
        select: {
          id: true,
          name: true,
          icon: true,
          description: true,
          examples: true,
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

      return {
        ...omit(newSubCategory, [
          "id",
          "category",
          "subcategoryMeasurementUnits",
        ]),
        id: newSubCategory!.id.toString(),
        category: {
          id: newSubCategory!.category.id.toString(),
          name: newSubCategory!.category.name,
          color: newSubCategory!.category.color,
        },
        measurementUnits: newSubCategory!.subcategoryMeasurementUnits.map(
          (smu) => ({
            id: smu.measurementUnit.id.toString(),
            name: smu.measurementUnit.name,
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
