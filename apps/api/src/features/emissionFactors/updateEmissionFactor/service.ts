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
  RateMeasurementUnitNotFoundError,
} from "../errors.js";
import { parseGasDetails } from "../mappers.js";
import { UserNotFoundError } from "../../users/errors.js";
import {
  findDimensionValue,
  checkDuplicateEmissionFactor,
  validateGasDetailsSum,
  validateSubcategoryChangeDimensions,
} from "../helpers.js";
import { resolveRateUnitMagnitudeFamily } from "../../measurementUnits/helpers.js";

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

  try {
    const result = await prismaClient.$transaction(async (tx) => {
      const existing = await tx.emissionFactor.findFirst({
        where: {
          id: emissionFactorId,
          status: EmissionFactorStatus.ACTIVE,
        },
        select: {
          id: true,
          subcategoryId: true,
          source: true,
          year: true,
          rateMeasurementUnitId: true,
          dimensionValue1Id: true,
          dimensionValue2Id: true,
          gasDetails: true,
          value: true,
        },
      });

      if (!existing) {
        throw new EmissionFactorNotFoundError(id);
      }

      if (data.gasDetails !== undefined || data.value !== undefined) {
        const gd = data.gasDetails ?? parseGasDetails(existing.gasDetails, id);
        validateGasDetailsSum(gd, data.value ?? existing.value.toNumber());
      }

      validateSubcategoryChangeDimensions(
        data.subcategoryId,
        existing.subcategoryId,
        data.dimensionValue1Name,
        data.dimensionValue2Name
      );

      const updateData: Prisma.EmissionFactorUncheckedUpdateInput = {
        updatedById: BigInt(user.id),
      };

      if (data.subcategoryId !== undefined)
        updateData.subcategoryId = BigInt(data.subcategoryId);
      if (data.rateMeasurementUnitId !== undefined)
        updateData.rateMeasurementUnitId = BigInt(data.rateMeasurementUnitId);
      if (data.source !== undefined) updateData.source = data.source;
      if (data.year !== undefined) updateData.year = data.year;
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

      // The denormalized unit family is re-derived on every update, not just
      // when the rate unit changes: it is the column the unique index compares,
      // so leaving a stale pair behind would let the row drift out of the
      // identity the index is enforcing.
      const effectiveRateUnitId =
        data.rateMeasurementUnitId !== undefined
          ? BigInt(data.rateMeasurementUnitId)
          : existing.rateMeasurementUnitId;
      const family = await resolveRateUnitMagnitudeFamily(
        tx,
        effectiveRateUnitId
      );
      updateData.numeratorMagnitudeId = family.numeratorMagnitudeId;
      updateData.denominatorMagnitudeId = family.denominatorMagnitudeId;

      const dim1Changed = data.dimensionValue1Name !== undefined;
      const dim2Changed = data.dimensionValue2Name !== undefined;

      // Normalization applies to the comparison, not to what is stored: a value
      // the maintainer put in a slot the subcategory does not require is real
      // data and stays on the row. It simply does not earn the factor a
      // separate identity.
      await checkDuplicateEmissionFactor(
        tx,
        {
          subcategoryId:
            updateData.subcategoryId != null
              ? BigInt(updateData.subcategoryId as bigint)
              : existing.subcategoryId,
          dimensionValue1Id: dim1Changed
            ? ((updateData.dimensionValue1Id as bigint | null) ?? null)
            : existing.dimensionValue1Id,
          dimensionValue2Id: dim2Changed
            ? ((updateData.dimensionValue2Id as bigint | null) ?? null)
            : existing.dimensionValue2Id,
          year: data.year !== undefined ? data.year : existing.year,
          source: data.source ?? existing.source,
          ...family,
        },
        emissionFactorId
      );

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
        year: emissionFactor.year,
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
      if (error.code === "P2003") {
        throw new RateMeasurementUnitNotFoundError();
      }
      if (error.code === "P2002") {
        throw new EmissionFactorDuplicateError();
      }
    }
    throw error;
  }
};
