import { type PrismaClient, Prisma } from "@repo/database";
import {
  EmissionFactorStatus,
  User,
  type UpdateEmissionFactorDimensionRequest,
  type UpdateEmissionFactorDimensionResponse,
} from "@repo/types";
import { UserNotFoundError } from "../../users/errors.js";
import {
  EmissionFactorDimensionNotFoundError,
  DimensionMustHaveAtLeastOneValueError,
  DuplicateDimensionValueError,
  DimensionValueNotFoundForRemovalError,
} from "../errors.js";

export const updateEmissionFactorDimensionService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateEmissionFactorDimensionRequest,
  user: User | null
): Promise<UpdateEmissionFactorDimensionResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const dimensionId = BigInt(id);

  try {
    const result = await prismaClient.$transaction(async (tx) => {
      const dimension = await tx.emissionFactorDimension.findUnique({
        where: { id: dimensionId },
        select: {
          id: true,
          subcategoryId: true,
          code: true,
          name: true,
          position: true,
          isRequired: true,
        },
      });

      if (!dimension) {
        throw new EmissionFactorDimensionNotFoundError();
      }

      const effectiveIsRequired = data.isRequired ?? dimension.isRequired;

      // Handle value removals
      if (data.values?.remove && data.values.remove.length > 0) {
        for (const valueIdStr of data.values.remove) {
          const valueId = BigInt(valueIdStr);

          // Verify the value exists and belongs to this dimension
          const value = await tx.emissionFactorDimensionValue.findFirst({
            where: { id: valueId, dimensionId: dimension.id },
            select: { id: true },
          });

          if (!value) {
            throw new DimensionValueNotFoundForRemovalError(valueIdStr);
          }

          // Cascade to emission factors based on whether dimension is required
          const efWhereClause =
            dimension.position === 1
              ? { dimensionValue1Id: valueId }
              : { dimensionValue2Id: valueId };

          if (effectiveIsRequired) {
            // Soft-delete emission factors that use this value in a required position
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
          } else {
            // Set FK to null for emission factors that use this value in a non-required position
            const efUpdateData =
              dimension.position === 1
                ? { dimensionValue1Id: null }
                : { dimensionValue2Id: null };

            await tx.emissionFactor.updateMany({
              where: {
                ...efWhereClause,
                status: { not: EmissionFactorStatus.DELETED },
              },
              data: {
                ...efUpdateData,
                updatedById: BigInt(user.id),
              },
            });
          }

          // Hard-delete the dimension value
          await tx.emissionFactorDimensionValue.delete({
            where: { id: valueId },
          });
        }
      }

      // Count remaining values after removal
      const remainingCount = await tx.emissionFactorDimensionValue.count({
        where: { dimensionId: dimension.id },
      });

      const addCount = data.values?.add?.length ?? 0;

      if (remainingCount + addCount < 1) {
        throw new DimensionMustHaveAtLeastOneValueError();
      }

      // Handle value additions
      if (data.values?.add && data.values.add.length > 0) {
        // Check for duplicates against existing values
        const existingValues = await tx.emissionFactorDimensionValue.findMany({
          where: { dimensionId: dimension.id },
          select: { value: true },
        });
        const existingValueNames = new Set(existingValues.map((v) => v.value));

        for (const valueName of data.values.add) {
          if (existingValueNames.has(valueName)) {
            throw new DuplicateDimensionValueError(valueName);
          }
          existingValueNames.add(valueName);
        }

        await Promise.all(
          data.values.add.map((value) =>
            tx.emissionFactorDimensionValue.create({
              data: {
                dimensionId: dimension.id,
                value,
                isActive: true,
                createdById: BigInt(user.id),
                updatedAt: null,
              },
            })
          )
        );
      }

      // Update dimension metadata
      const updateData: Prisma.EmissionFactorDimensionUncheckedUpdateInput = {
        updatedById: BigInt(user.id),
      };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;

      await tx.emissionFactorDimension.update({
        where: { id: dimension.id },
        data: updateData,
      });

      // Re-fetch the full dimension with values
      const updated = await tx.emissionFactorDimension.findUnique({
        where: { id: dimension.id },
        select: {
          id: true,
          subcategoryId: true,
          code: true,
          name: true,
          position: true,
          isRequired: true,
          values: {
            where: { isActive: true },
            select: { id: true, value: true },
            orderBy: { value: "asc" },
          },
        },
      });

      if (!updated) {
        throw new EmissionFactorDimensionNotFoundError();
      }

      return {
        id: updated.id.toString(),
        subcategoryId: updated.subcategoryId.toString(),
        code: updated.code,
        name: updated.name,
        position: updated.position,
        isRequired: updated.isRequired,
        values: updated.values.map((v) => ({
          id: v.id.toString(),
          value: v.value,
        })),
      };
    });

    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new DuplicateDimensionValueError("unknown");
      }
    }
    throw error;
  }
};
