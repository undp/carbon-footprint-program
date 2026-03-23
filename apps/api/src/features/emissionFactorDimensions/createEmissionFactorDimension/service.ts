import { type PrismaClient, Prisma } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  SubcategoryStatus,
  User,
  type CreateEmissionFactorDimensionRequest,
  type CreateEmissionFactorDimensionResponse,
} from "@repo/types";
import { UserNotFoundError } from "../../users/errors.js";
import {
  SubcategoryNotFoundForDimensionError,
  MaxDimensionsPerSubcategoryError,
  DimensionPositionAlreadyTakenError,
  DuplicateDimensionValueError,
} from "../errors.js";

export const createEmissionFactorDimensionService = async (
  prismaClient: PrismaClient,
  data: CreateEmissionFactorDimensionRequest,
  user: User | null
): Promise<CreateEmissionFactorDimensionResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const subcategoryId = BigInt(data.subcategoryId);

  try {
    const result = await prismaClient.$transaction(async (tx) => {
      const subcategory = await tx.subcategory.findFirst({
        where: {
          id: subcategoryId,
          status: { not: SubcategoryStatus.DELETED },
        },
        select: { id: true },
      });

      if (!subcategory) {
        throw new SubcategoryNotFoundForDimensionError();
      }

      const existingCount = await tx.emissionFactorDimension.count({
        where: {
          subcategoryId,
          status: EmissionFactorDimensionStatus.ACTIVE,
        },
      });

      if (existingCount >= 2) {
        throw new MaxDimensionsPerSubcategoryError();
      }

      const existingPosition = await tx.emissionFactorDimension.findFirst({
        where: {
          subcategoryId,
          position: data.position,
          status: EmissionFactorDimensionStatus.ACTIVE,
        },
        select: { id: true },
      });

      if (existingPosition) {
        throw new DimensionPositionAlreadyTakenError(data.position.toString());
      }

      const code = `dim_${subcategoryId}_${data.position}_${Date.now()}`;

      const dimension = await tx.emissionFactorDimension.create({
        data: {
          subcategoryId,
          code,
          name: data.name,
          position: data.position,
          isRequired: data.isRequired,
          status: EmissionFactorDimensionStatus.ACTIVE,
          createdById: BigInt(user.id),
          updatedAt: null,
        },
        select: {
          id: true,
          code: true,
          name: true,
          position: true,
          isRequired: true,
        },
      });

      const createdValues = await Promise.all(
        data.values.map((value) =>
          tx.emissionFactorDimensionValue.create({
            data: {
              dimensionId: dimension.id,
              value,
              status: EmissionFactorDimensionValueStatus.ACTIVE,
              createdById: BigInt(user.id),
              updatedAt: null,
            },
            select: { id: true, value: true },
          })
        )
      );

      return {
        id: dimension.id.toString(),
        subcategoryId: subcategoryId.toString(),
        code: dimension.code,
        name: dimension.name,
        position: dimension.position,
        isRequired: dimension.isRequired,
        values: createdValues.map((v) => ({
          id: v.id.toString(),
          value: v.value,
        })),
      };
    });

    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.map(String)
          : error.meta?.target
            ? [JSON.stringify(error.meta.target)]
            : [];
        if (target.some((item) => item.includes("position"))) {
          throw new DimensionPositionAlreadyTakenError(
            data.position.toString()
          );
        }
        throw new DuplicateDimensionValueError("unknown");
      }
    }
    throw error;
  }
};
