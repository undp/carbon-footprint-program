import type { PrismaClient } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
  User,
} from "@repo/types";
import { UserNotFoundError } from "../../users/errors.js";
import {
  DimensionDeletionNotAllowedError,
  EmissionFactorDimensionNotFoundError,
} from "../errors.js";

export const deleteEmissionFactorDimensionService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<void> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const dimensionId = BigInt(id);
  const userId = BigInt(user.id);

  const dimension = await prismaClient.emissionFactorDimension.findFirst({
    where: {
      id: dimensionId,
      status: EmissionFactorDimensionStatus.ACTIVE,
    },
    select: {
      id: true,
      subcategoryId: true,
      position: true,
      isRequired: true,
      values: {
        select: { id: true },
      },
    },
  });

  if (!dimension) {
    throw new EmissionFactorDimensionNotFoundError();
  }

  const activeDimensionCount = await prismaClient.emissionFactorDimension.count({
    where: {
      subcategoryId: dimension.subcategoryId,
      status: EmissionFactorDimensionStatus.ACTIVE,
    },
  });

  if (activeDimensionCount > 1 && dimension.position === 1) {
    throw new DimensionDeletionNotAllowedError();
  }

  await prismaClient.$transaction(async (tx) => {
    const valueIds = dimension.values.map((v) => v.id);

    if (valueIds.length > 0) {
      const efWhereClause =
        dimension.position === 1
          ? { dimensionValue1Id: { in: valueIds } }
          : { dimensionValue2Id: { in: valueIds } };

      if (dimension.isRequired) {
        // Soft-delete all active emission factors referencing these values
        await tx.emissionFactor.updateMany({
          where: {
            ...efWhereClause,
            status: EmissionFactorStatus.ACTIVE,
          },
          data: {
            status: EmissionFactorStatus.DELETED,
            updatedById: userId,
          },
        });
      } else {
        // Nullify FKs for non-required dimensions
        const efUpdateData =
          dimension.position === 1
            ? { dimensionValue1Id: null }
            : { dimensionValue2Id: null };

        await tx.emissionFactor.updateMany({
          where: {
            ...efWhereClause,
            status: EmissionFactorStatus.ACTIVE,
          },
          data: {
            ...efUpdateData,
            updatedById: userId,
          },
        });
      }
    }

    await tx.emissionFactorDimensionValue.updateMany({
      where: { dimensionId },
      data: {
        status: EmissionFactorDimensionValueStatus.DELETED,
        updatedById: userId,
      },
    });

    await tx.emissionFactorDimension.update({
      where: { id: dimensionId },
      data: {
        status: EmissionFactorDimensionStatus.DELETED,
        updatedById: userId,
      },
    });
  });
};
