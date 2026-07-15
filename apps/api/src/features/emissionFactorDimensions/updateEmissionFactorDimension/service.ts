import { type PrismaClient, Prisma } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
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
  DimensionIsRequiredChangeBlockedError,
  DimensionValueNotFoundForRenameError,
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
  const userId = BigInt(user.id);

  try {
    const result = await prismaClient.$transaction(async (tx) => {
      const dimension = await tx.emissionFactorDimension.findFirst({
        where: {
          id: dimensionId,
          status: EmissionFactorDimensionStatus.ACTIVE,
        },
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

      // Block isRequired change if active emission factors exist for this subcategory
      if (
        data.isRequired !== undefined &&
        data.isRequired !== dimension.isRequired
      ) {
        const activeEfCount = await tx.emissionFactor.count({
          where: {
            subcategoryId: dimension.subcategoryId,
            status: EmissionFactorStatus.ACTIVE,
          },
        });
        if (activeEfCount > 0) {
          throw new DimensionIsRequiredChangeBlockedError();
        }
      }

      const valueIdsToRemove = [
        ...new Set(
          (data.values?.remove ?? []).map((valueId) => BigInt(valueId))
        ),
      ];

      if (valueIdsToRemove.length > 0) {
        const removableValues = await tx.emissionFactorDimensionValue.findMany({
          where: {
            id: { in: valueIdsToRemove },
            dimensionId: dimension.id,
            status: EmissionFactorDimensionValueStatus.ACTIVE,
          },
          select: { id: true },
        });

        if (removableValues.length !== valueIdsToRemove.length) {
          const removableIds = new Set(
            removableValues.map((value) => value.id.toString())
          );
          const missingId = [...new Set(data.values?.remove ?? [])].find(
            (valueId) => !removableIds.has(valueId)
          );
          throw new DimensionValueNotFoundForRemovalError(missingId ?? "");
        }
      }

      const activeValueCount = await tx.emissionFactorDimensionValue.count({
        where: {
          dimensionId: dimension.id,
          status: EmissionFactorDimensionValueStatus.ACTIVE,
        },
      });

      const addCount = data.values?.add?.length ?? 0;

      if (activeValueCount - valueIdsToRemove.length + addCount < 1) {
        throw new DimensionMustHaveAtLeastOneValueError();
      }

      if (valueIdsToRemove.length > 0) {
        const efWhereClause =
          dimension.position === 1
            ? { dimensionValue1Id: { in: valueIdsToRemove } }
            : { dimensionValue2Id: { in: valueIdsToRemove } };

        if (dimension.isRequired) {
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

        await tx.emissionFactorDimensionValue.updateMany({
          where: { id: { in: valueIdsToRemove } },
          data: {
            status: EmissionFactorDimensionValueStatus.DELETED,
            updatedById: userId,
          },
        });
      }

      if (data.values?.rename && data.values.rename.length > 0) {
        for (const { id: valueIdStr, newValue } of data.values.rename) {
          const valueId = BigInt(valueIdStr);

          const value = await tx.emissionFactorDimensionValue.findFirst({
            where: {
              id: valueId,
              dimensionId: dimension.id,
              status: EmissionFactorDimensionValueStatus.ACTIVE,
            },
            select: { id: true },
          });

          if (!value) {
            throw new DimensionValueNotFoundForRenameError(valueIdStr);
          }

          const duplicate = await tx.emissionFactorDimensionValue.findFirst({
            where: {
              dimensionId: dimension.id,
              value: newValue,
              status: EmissionFactorDimensionValueStatus.ACTIVE,
              id: { not: valueId },
            },
            select: { id: true },
          });

          if (duplicate) {
            throw new DuplicateDimensionValueError(newValue);
          }

          await tx.emissionFactorDimensionValue.update({
            where: { id: valueId },
            data: {
              value: newValue,
              updatedById: userId,
            },
          });
        }
      }

      // Handle value additions
      if (data.values?.add && data.values.add.length > 0) {
        // Check for duplicates against existing values
        const existingValues = await tx.emissionFactorDimensionValue.findMany({
          where: {
            dimensionId: dimension.id,
            status: EmissionFactorDimensionValueStatus.ACTIVE,
          },
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
                status: EmissionFactorDimensionValueStatus.ACTIVE,
                createdById: userId,
                updatedAt: null,
              },
            })
          )
        );
      }

      // Update dimension metadata
      const updateData: Prisma.EmissionFactorDimensionUncheckedUpdateInput = {
        updatedById: userId,
      };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.isRequired !== undefined)
        updateData.isRequired = data.isRequired;

      await tx.emissionFactorDimension.update({
        where: { id: dimension.id },
        data: updateData,
      });

      // Re-fetch the full dimension with values
      const updated = await tx.emissionFactorDimension.findFirst({
        where: {
          id: dimension.id,
          status: EmissionFactorDimensionStatus.ACTIVE,
        },
        select: {
          id: true,
          subcategoryId: true,
          code: true,
          name: true,
          position: true,
          isRequired: true,
          values: {
            where: { status: EmissionFactorDimensionValueStatus.ACTIVE },
            select: { id: true, value: true },
            orderBy: { value: "asc" },
          },
        },
      });

      /* v8 ignore next -- unreachable: `updated` was fetched and confirmed ACTIVE earlier in this same transaction, and its status is not changed here */
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
