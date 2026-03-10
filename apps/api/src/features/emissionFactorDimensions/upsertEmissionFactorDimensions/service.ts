import type { PrismaClient } from "@repo/database";
import {
  SubCategoryStatus,
  User,
  type UpsertEmissionFactorDimensionsRequest,
  type UpsertEmissionFactorDimensionsResponse,
} from "@repo/types";
import { UserNotFoundError } from "../../users/errors.js";

export const upsertEmissionFactorDimensionsService = async (
  prismaClient: PrismaClient,
  data: UpsertEmissionFactorDimensionsRequest,
  user: User | null
): Promise<UpsertEmissionFactorDimensionsResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  let totalUpdated = 0;

  await prismaClient.$transaction(async (tx) => {
    for (const entry of data) {
      const subcategoryId = BigInt(entry.subcategoryId);

      // Verify subcategory exists
      const subcategory = await tx.subcategory.findFirst({
        where: {
          id: subcategoryId,
          status: { not: SubCategoryStatus.DELETED },
        },
        select: { id: true },
      });

      if (!subcategory) continue;

      // Get existing dimensions for this subcategory
      const existingDimensions = await tx.emissionFactorDimension.findMany({
        where: { subcategoryId },
        select: { id: true, code: true },
      });

      const existingByCode = new Map(
        existingDimensions.map((d) => [d.code, d.id])
      );
      const incomingCodes = new Set(entry.dimensions.map((d) => d.code));

      // Delete dimensions that are no longer in the configuration
      const toDelete = existingDimensions.filter(
        (d) => !incomingCodes.has(d.code)
      );
      if (toDelete.length > 0) {
        await tx.emissionFactorDimension.deleteMany({
          where: { id: { in: toDelete.map((d) => d.id) } },
        });
      }

      // Upsert each dimension
      for (const dim of entry.dimensions) {
        const existingId = existingByCode.get(dim.code);

        if (existingId) {
          await tx.emissionFactorDimension.update({
            where: { id: existingId },
            data: {
              name: dim.name,
              position: dim.position,
              isRequired: dim.isRequired,
              updatedById: BigInt(user.id),
            },
          });
        } else {
          await tx.emissionFactorDimension.create({
            data: {
              subcategoryId,
              code: dim.code,
              name: dim.name,
              position: dim.position,
              isRequired: dim.isRequired,
              createdById: BigInt(user.id),
              updatedAt: null,
            },
          });
        }

        totalUpdated++;
      }
    }
  });

  return { updated: totalUpdated };
};
