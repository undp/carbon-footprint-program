import { type PrismaClient, Prisma } from "@repo/database";
import {
  CategoryStatus,
  SubcategoryStatus,
  User,
  IconNameSchema,
  type CreateSubcategoryRequest,
  type CreateSubcategoryResponse,
} from "@repo/types";
import {
  CategoryNotFoundForSubcategoryError,
  SubcategoryNameAlreadyExistsError,
} from "../errors.js";
import { getDuplicatedFieldsFromP2002Error } from "@/errors/index.js";
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
      const category = await tx.category.findFirst({
        where: {
          id: BigInt(data.categoryId),
          status: CategoryStatus.ACTIVE,
        },
        select: { id: true },
      });

      if (!category) {
        throw new CategoryNotFoundForSubcategoryError();
      }

      const newSubcategory = await tx.subcategory.create({
        data: {
          categoryId: category.id,
          name: data.name,
          icon: data.icon,
          description: data.description,
          explanation: data.explanation ?? null,
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
