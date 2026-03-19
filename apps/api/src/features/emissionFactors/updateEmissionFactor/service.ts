import { type PrismaClient, Prisma } from "@repo/database";
import {
  EmissionFactorStatus,
  User,
  type UpdateEmissionFactorRequest,
  type UpdateEmissionFactorResponse,
} from "@repo/types";
import {
  EmissionFactorNotFoundError,
  EmissionFactorDuplicateError,
  EmissionFactorSourceConflictError,
  EmissionFactorGasDetailsMismatchError,
} from "../errors.js";
import { parseGasDetails } from "../mappers.js";
import { UserNotFoundError } from "../../users/errors.js";
import { findDimensionValue } from "../helpers.js";

export const updateEmissionFactorService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateEmissionFactorRequest,
  user: User | null
): Promise<UpdateEmissionFactorResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const emissionFactorId = BigInt(id);

  const existing = await prismaClient.emissionFactor.findFirst({
    where: {
      id: emissionFactorId,
      status: { not: EmissionFactorStatus.DELETED },
    },
    select: { id: true, subcategoryId: true, gasDetails: true, value: true },
  });

  if (!existing) {
    throw new EmissionFactorNotFoundError(id);
  }

  // Enforce: all active EFs for a subcategory must share the same source
  if (data.source !== undefined) {
    const targetSubcategoryId =
      data.subcategoryId !== undefined
        ? BigInt(data.subcategoryId)
        : existing.subcategoryId;

    const existingSource = await prismaClient.emissionFactor.findFirst({
      where: {
        subcategoryId: targetSubcategoryId,
        status: { not: EmissionFactorStatus.DELETED },
        id: { not: emissionFactorId },
      },
      select: { source: true },
    });

    if (existingSource && existingSource.source !== data.source) {
      throw new EmissionFactorSourceConflictError(existingSource.source);
    }
  }

  // Validate gasDetails sum matches declared value (if breakdown is non-zero)
  if (data.gasDetails !== undefined || data.value !== undefined) {
    const gd = data.gasDetails ?? parseGasDetails(existing.gasDetails, id);
    const gasSum =
      gd.CO2_FOSSIL + gd.CH4 + gd.N2O + gd.HFC + gd.PFC + gd.SF6 + gd.NF3;
    if (gasSum > 0) {
      const declaredValue = data.value ?? existing.value.toNumber();
      if (Math.abs(gasSum - declaredValue) > 1e-4) {
        throw new EmissionFactorGasDetailsMismatchError(
          gasSum.toFixed(4),
          declaredValue.toFixed(4)
        );
      }
    }
  }

  try {
    const result = await prismaClient.$transaction(async (tx) => {
      const updateData: Prisma.EmissionFactorUncheckedUpdateInput = {
        updatedById: BigInt(user.id),
      };

      if (data.subcategoryId !== undefined)
        updateData.subcategoryId = BigInt(data.subcategoryId);
      if (data.rateMeasurementUnitId !== undefined)
        updateData.rateMeasurementUnitId = BigInt(data.rateMeasurementUnitId);
      if (data.source !== undefined) updateData.source = data.source;
      if (data.gasDetails !== undefined)
        updateData.gasDetails = data.gasDetails;
      if (data.value !== undefined)
        updateData.value = new Prisma.Decimal(data.value);

      // Handle dimension value names (lookup only)
      if (data.dimensionValue1Name !== undefined) {
        if (data.dimensionValue1Name === null) {
          updateData.dimensionValue1Id = null;
        } else {
          const subcategoryId =
            data.subcategoryId !== undefined
              ? BigInt(data.subcategoryId)
              : existing.subcategoryId;
          updateData.dimensionValue1Id = await findDimensionValue(
            tx,
            subcategoryId,
            1,
            data.dimensionValue1Name
          );
        }
      }

      if (data.dimensionValue2Name !== undefined) {
        if (data.dimensionValue2Name === null) {
          updateData.dimensionValue2Id = null;
        } else {
          const subcategoryId =
            data.subcategoryId !== undefined
              ? BigInt(data.subcategoryId)
              : existing.subcategoryId;
          updateData.dimensionValue2Id = await findDimensionValue(
            tx,
            subcategoryId,
            2,
            data.dimensionValue2Name
          );
        }
      }

      await tx.emissionFactor.update({
        where: { id: emissionFactorId },
        data: updateData,
      });

      const emissionFactor = await tx.emissionFactor.findUnique({
        where: { id: emissionFactorId },
        include: {
          subcategory: { select: { id: true, name: true } },
          dimensionValue1: { select: { id: true, value: true } },
          dimensionValue2: { select: { id: true, value: true } },
          rateMeasurementUnit: { select: { id: true, name: true } },
        },
      });

      if (!emissionFactor) {
        throw new EmissionFactorNotFoundError(id);
      }

      return {
        id: emissionFactor.id.toString(),
        value: emissionFactor.value.toString(),
        source: emissionFactor.source,
        subcategoryId: emissionFactor.subcategory.id.toString(),
        subcategoryName: emissionFactor.subcategory.name,
        dimensionValue1Id:
          emissionFactor.dimensionValue1?.id.toString() ?? null,
        dimensionValue1Name: emissionFactor.dimensionValue1?.value ?? null,
        dimensionValue2Id:
          emissionFactor.dimensionValue2?.id.toString() ?? null,
        dimensionValue2Name: emissionFactor.dimensionValue2?.value ?? null,
        rateMeasurementUnitId: emissionFactor.rateMeasurementUnit.id.toString(),
        rateMeasurementUnitName: emissionFactor.rateMeasurementUnit.name,
        gasDetails: parseGasDetails(
          emissionFactor.gasDetails,
          emissionFactor.id
        ),
      };
    });

    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new EmissionFactorDuplicateError();
      }
    }
    throw error;
  }
};

