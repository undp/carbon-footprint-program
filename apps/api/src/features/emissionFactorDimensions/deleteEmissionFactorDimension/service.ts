import type { PrismaClient } from "@repo/database";
import { EmissionFactorStatus, User } from "@repo/types";
import { UserNotFoundError } from "../../users/errors.js";
import { EmissionFactorDimensionNotFoundError } from "../errors.js";

export const deleteEmissionFactorDimensionService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<void> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const dimensionId = BigInt(id);

  const dimension = await prismaClient.emissionFactorDimension.findUnique({
    where: { id: dimensionId },
    select: {
      id: true,
      position: true,
      values: {
        select: { id: true },
      },
    },
  });

  if (!dimension) {
    throw new EmissionFactorDimensionNotFoundError();
  }

  await prismaClient.$transaction(async (tx) => {
    const valueIds = dimension.values.map((v) => v.id);

    if (valueIds.length > 0) {
      // Soft-delete all ACTIVE emission factors referencing any of these values
      const efWhereClause =
        dimension.position === 1
          ? { dimensionValue1Id: { in: valueIds } }
          : { dimensionValue2Id: { in: valueIds } };

      await tx.emissionFactor.updateMany({
        where: {
          ...efWhereClause,
          status: { not: EmissionFactorStatus.DELETED },
        },
        data: {
          status: EmissionFactorStatus.DELETED,
          updatedById: BigInt(user.id),
        },
      });
    }

    // Hard-delete the dimension (CASCADE removes values, SET NULL clears EF FKs)
    await tx.emissionFactorDimension.delete({
      where: { id: dimensionId },
    });
  });
};
