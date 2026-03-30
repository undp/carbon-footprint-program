import { type PrismaClient, Prisma } from "@repo/database";
import {
  EmissionFactorStatus,
  SubcategoryStatus,
  User,
  type CreateEmissionFactorRequest,
  type CreateEmissionFactorResponse,
} from "@repo/types";
import { EMISSION_FACTOR_GAS_DETAILS_TOLERANCE } from "@/config/constants.js";
import {
  SubcategoryNotFoundForEmissionFactorError,
  RateMeasurementUnitNotFoundError,
  EmissionFactorDuplicateError,
  EmissionFactorSourceConflictError,
  EmissionFactorGasDetailsMismatchError,
} from "../errors.js";
import { parseGasDetails } from "../mappers.js";
import { UserNotFoundError } from "../../users/errors.js";
import {
  findDimensionValue,
  checkDuplicateEmissionFactor,
} from "../helpers.js";

export const createEmissionFactorService = async (
  prismaClient: PrismaClient,
  data: CreateEmissionFactorRequest,
  user: User | null
): Promise<CreateEmissionFactorResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  // Validate subcategory exists and is not deleted
  const subcategory = await prismaClient.subcategory.findFirst({
    where: {
      id: BigInt(data.subcategoryId),
      status: SubcategoryStatus.ACTIVE,
    },
    select: { id: true, name: true },
  });

  if (!subcategory) {
    throw new SubcategoryNotFoundForEmissionFactorError();
  }

  // Validate rate measurement unit exists
  const rateUnit = await prismaClient.rateMeasurementUnit.findUnique({
    where: { id: BigInt(data.rateMeasurementUnitId) },
    select: { id: true, name: true },
  });

  if (!rateUnit) {
    throw new RateMeasurementUnitNotFoundError();
  }

  // Enforce: all active EFs for a subcategory must share the same source
  const existingSource = await prismaClient.emissionFactor.findFirst({
    where: {
      subcategoryId: subcategory.id,
      status: EmissionFactorStatus.ACTIVE,
    },
    select: { source: true },
  });

  if (existingSource && existingSource.source !== data.source) {
    throw new EmissionFactorSourceConflictError(existingSource.source);
  }

  // Validate gasDetails sum matches declared value (if breakdown is non-zero)
  const gd = data.gasDetails;
  const gasSum = Object.values(gd).reduce((sum, value) => sum + value, 0);
  if (gasSum > 0) {
    const declaredValue = data.value;
    if (
      Math.abs(gasSum - declaredValue) > EMISSION_FACTOR_GAS_DETAILS_TOLERANCE
    ) {
      throw new EmissionFactorGasDetailsMismatchError(
        gasSum.toFixed(4),
        declaredValue.toFixed(4)
      );
    }
  }

  try {
    const result = await prismaClient.$transaction(async (tx) => {
      // Find-or-create dimension values if provided
      let dimensionValue1Id: bigint | null = null;
      let dimensionValue2Id: bigint | null = null;

      if (data.dimensionValue1Name) {
        dimensionValue1Id = await findDimensionValue(
          tx,
          subcategory.id,
          1,
          data.dimensionValue1Name
        );
      }

      if (data.dimensionValue2Name) {
        dimensionValue2Id = await findDimensionValue(
          tx,
          subcategory.id,
          2,
          data.dimensionValue2Name
        );
      }

      await checkDuplicateEmissionFactor(
        tx,
        subcategory.id,
        dimensionValue1Id,
        dimensionValue2Id
      );

      const emissionFactor = await tx.emissionFactor.create({
        data: {
          subcategoryId: subcategory.id,
          dimensionValue1Id,
          dimensionValue2Id,
          rateMeasurementUnitId: rateUnit.id,
          source: data.source,
          gasDetails: data.gasDetails,
          value: new Prisma.Decimal(data.value),
          status: EmissionFactorStatus.ACTIVE,
          createdById: BigInt(user.id),
          updatedAt: null,
        },
        include: {
          subcategory: { select: { id: true, name: true } },
          dimensionValue1: { select: { id: true, value: true } },
          dimensionValue2: { select: { id: true, value: true } },
          rateMeasurementUnit: { select: { id: true, name: true } },
        },
      });

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
