import {
  type PrismaClient,
  Prisma,
  MeasurementUnitStatus,
} from "@repo/database";
import type {
  UpdateMeasurementUnitBody,
  UpdateMeasurementUnitResponse,
  User,
} from "@repo/types";
import {
  DataIntegrityError,
  getDuplicatedFieldsFromP2002Error,
} from "@/errors/index.js";
import {
  resolveKgMeasurementUnit,
  getReferenceCount,
  buildCanonicalRmuFields,
  assertNotKgMu,
} from "../helpers.js";
import {
  MeasurementUnitNotFoundError,
  BaseUnitToggleNotAllowedError,
  MeasurementUnitFieldsLockedError,
  BaseFactorOneReservedForBaseUnitError,
  MeasurementUnitAbbreviationAlreadyExistsError,
} from "../errors.js";
import { mapMeasurementUnitToResponse } from "../mappers.js";

export const updateMeasurementUnitService = async (
  prismaClient: PrismaClient,
  id: string,
  body: UpdateMeasurementUnitBody,
  _user: User | null
): Promise<UpdateMeasurementUnitResponse> => {
  return await prismaClient.$transaction(async (tx) => {
    const target = await tx.measurementUnit.findUnique({
      where: { id: BigInt(id) },
    });

    if (!target || target.status === MeasurementUnitStatus.DELETED) {
      throw new MeasurementUnitNotFoundError(id);
    }

    assertNotKgMu(target);

    if (body.isBase !== undefined && body.isBase !== target.isBase) {
      throw new BaseUnitToggleNotAllowedError();
    }

    const hasStructuralChange =
      (body.magnitudeId !== undefined &&
        BigInt(body.magnitudeId) !== target.magnitudeId) ||
      (body.abbreviation !== undefined &&
        body.abbreviation !== target.abbreviation) ||
      (body.baseFactor !== undefined && body.baseFactor !== target.baseFactor);

    if (target.isBase && hasStructuralChange) {
      throw new MeasurementUnitFieldsLockedError();
    }

    const refCount = await getReferenceCount(tx, target.id);

    if (refCount > 0 && hasStructuralChange) {
      throw new MeasurementUnitFieldsLockedError();
    }

    if (
      body.baseFactor !== undefined &&
      body.baseFactor === 1 &&
      !target.isBase
    ) {
      const effectiveMagnitudeId =
        body.magnitudeId !== undefined
          ? BigInt(body.magnitudeId)
          : target.magnitudeId;
      const existingBase = await tx.measurementUnit.findFirst({
        where: {
          magnitudeId: effectiveMagnitudeId,
          isBase: true,
          status: MeasurementUnitStatus.ACTIVE,
          id: { not: target.id },
        },
        select: { id: true },
      });
      if (existingBase) {
        throw new BaseFactorOneReservedForBaseUnitError();
      }
    }

    const updateData: Prisma.MeasurementUnitUncheckedUpdateInput = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.abbreviation !== undefined)
      updateData.abbreviation = body.abbreviation;
    if (body.magnitudeId !== undefined)
      updateData.magnitudeId = BigInt(body.magnitudeId);
    if (body.baseFactor !== undefined) updateData.baseFactor = body.baseFactor;
    if (body.isBase !== undefined) updateData.isBase = body.isBase;

    let updatedMu;
    try {
      updatedMu = await tx.measurementUnit.update({
        where: { id: target.id },
        data: updateData,
        include: { magnitude: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (duplicatedFields.includes("abbreviation")) {
          throw new MeasurementUnitAbbreviationAlreadyExistsError();
        }
      }
      throw error;
    }

    const nameChanged = body.name !== undefined && body.name !== target.name;
    const abbreviationChanged =
      body.abbreviation !== undefined &&
      body.abbreviation !== target.abbreviation;

    if (nameChanged || abbreviationChanged) {
      const kg = await resolveKgMeasurementUnit(tx);
      const canonicalRmu = await tx.rateMeasurementUnit.findFirst({
        where: {
          numeratorMeasurementUnitId: kg.id,
          denominatorMeasurementUnitId: target.id,
        },
      });

      if (!canonicalRmu) {
        throw new DataIntegrityError(
          `No canonical RMU found for MeasurementUnit id=${target.id} abbreviation="${target.abbreviation}" during update`
        );
      }

      await tx.rateMeasurementUnit.update({
        where: { id: canonicalRmu.id },
        data: buildCanonicalRmuFields(updatedMu),
      });
    }

    return mapMeasurementUnitToResponse(updatedMu, refCount);
  });
};
