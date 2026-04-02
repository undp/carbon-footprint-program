import { type PrismaClient, Prisma } from "@repo/database";
import {
  EmissionFactorStatus,
  SubcategoryStatus,
  User,
  type CreateEmissionFactorRequest,
  type CreateEmissionFactorResponse,
} from "@repo/types";
import {
  SubcategoryNotFoundForEmissionFactorError,
  EmissionFactorDuplicateError,
  RateMeasurementUnitNotFoundError,
} from "../errors.js";
import { parseGasDetails } from "../mappers.js";
import { UserNotFoundError } from "../../users/errors.js";
import {
  findDimensionValue,
  checkDuplicateEmissionFactor,
  validateSourceConsistency,
  validateGasDetailsSum,
} from "../helpers.js";

export const createEmissionFactorService = async (
  prismaClient: PrismaClient,
  data: CreateEmissionFactorRequest,
  user: User | null
): Promise<CreateEmissionFactorResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  validateGasDetailsSum(data.gasDetails, data.value);

  try {
    const result = await prismaClient.$transaction(async (tx) => {
      // Validate subcategory exists and is not deleted
      const subcategory = await tx.subcategory.findFirst({
        where: {
          id: BigInt(data.subcategoryId),
          status: SubcategoryStatus.ACTIVE,
        },
        select: { id: true, name: true },
      });

      if (!subcategory) {
        throw new SubcategoryNotFoundForEmissionFactorError();
      }

      await validateSourceConsistency(tx, subcategory.id, data.source);

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
          rateMeasurementUnitId: BigInt(data.rateMeasurementUnitId),
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
