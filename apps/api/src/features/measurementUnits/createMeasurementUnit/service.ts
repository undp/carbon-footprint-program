import { type PrismaClient, MeasurementUnitStatus } from "@repo/database";
import {
  type CreateMeasurementUnitBody,
  type CreateMeasurementUnitResponse,
  type User,
  MeasurementUnitCreationResultEnum,
} from "@repo/types";
import { DataIntegrityError } from "@/errors/index.js";
import {
  resolveKgMeasurementUnit,
  getReferenceCount,
  buildCanonicalRmuFields,
} from "../helpers.js";
import {
  MagnitudeAlreadyHasBaseUnitError,
  MeasurementUnitAbbreviationAlreadyExistsError,
  BaseUnitMustHaveBaseFactorOneError,
  BaseFactorOneReservedForBaseUnitError,
} from "../errors.js";
import { mapMeasurementUnitToResponse } from "../mappers.js";

export const createMeasurementUnitService = async (
  prismaClient: PrismaClient,
  body: CreateMeasurementUnitBody,
  _user: User | null
): Promise<CreateMeasurementUnitResponse> => {
  return await prismaClient.$transaction(async (tx) => {
    const kg = await resolveKgMeasurementUnit(tx);

    if (body.isBase) {
      if (body.baseFactor !== 1) {
        throw new BaseUnitMustHaveBaseFactorOneError();
      }

      const existingBase = await tx.measurementUnit.findFirst({
        where: {
          magnitudeId: BigInt(body.magnitudeId),
          isBase: true,
          status: MeasurementUnitStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (existingBase) throw new MagnitudeAlreadyHasBaseUnitError();
    }

    if (!body.isBase && body.baseFactor === 1) {
      const existingBase = await tx.measurementUnit.findFirst({
        where: {
          magnitudeId: BigInt(body.magnitudeId),
          isBase: true,
          status: MeasurementUnitStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (existingBase) {
        throw new BaseFactorOneReservedForBaseUnitError();
      }
    }

    const existing = await tx.measurementUnit.findUnique({
      where: { abbreviation: body.abbreviation },
    });

    if (!existing) {
      const newMu = await tx.measurementUnit.create({
        data: {
          name: body.name,
          abbreviation: body.abbreviation,
          magnitudeId: BigInt(body.magnitudeId),
          baseFactor: body.baseFactor,
          isBase: body.isBase,
        },
        include: { magnitude: true },
      });

      await tx.rateMeasurementUnit.create({
        data: {
          ...buildCanonicalRmuFields(newMu),
          numeratorMeasurementUnitId: kg.id,
          denominatorMeasurementUnitId: newMu.id,
        },
      });

      return {
        ...mapMeasurementUnitToResponse(newMu, 0),
        action: MeasurementUnitCreationResultEnum.created,
      };
    }

    if (existing.status === MeasurementUnitStatus.ACTIVE) {
      throw new MeasurementUnitAbbreviationAlreadyExistsError();
    }

    // Restore a soft-deleted unit
    const refCount = await getReferenceCount(tx, existing.id);
    const action =
      refCount > 0
        ? MeasurementUnitCreationResultEnum.restoredLabelsOnly
        : MeasurementUnitCreationResultEnum.fullyRestored;

    const updateData =
      refCount > 0
        ? { name: body.name, abbreviation: body.abbreviation }
        : {
            name: body.name,
            abbreviation: body.abbreviation,
            magnitudeId: BigInt(body.magnitudeId),
            baseFactor: body.baseFactor,
            isBase: body.isBase,
          };

    const updatedMu = await tx.measurementUnit.update({
      where: { id: existing.id },
      data: { ...updateData, status: MeasurementUnitStatus.ACTIVE },
      include: { magnitude: true },
    });

    // Restore the canonical RMU
    const canonicalRmu = await tx.rateMeasurementUnit.findFirst({
      where: {
        numeratorMeasurementUnitId: kg.id,
        denominatorMeasurementUnitId: existing.id,
      },
    });

    if (!canonicalRmu) {
      throw new DataIntegrityError(
        `No canonical RMU found for MeasurementUnit id=${existing.id} abbreviation="${existing.abbreviation}" during restore`
      );
    }

    await tx.rateMeasurementUnit.update({
      where: { id: canonicalRmu.id },
      data: {
        ...buildCanonicalRmuFields(updatedMu),
        status: MeasurementUnitStatus.ACTIVE,
      },
    });

    return { ...mapMeasurementUnitToResponse(updatedMu, refCount), action };
  });
};
