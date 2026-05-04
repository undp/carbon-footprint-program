import {
  type PrismaClient,
  Prisma,
  MeasurementUnitStatus,
} from "@repo/database";
import type {
  UpdateMeasurementUnitBody,
  UpdateMeasurementUnitResponse,
} from "@repo/types";
import { DataIntegrityError } from "@/errors/index.js";
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
} from "../errors.js";
import { mapMeasurementUnitToResponse } from "../mappers.js";

export const updateMeasurementUnitService = async (
  prismaClient: PrismaClient,
  id: string,
  body: UpdateMeasurementUnitBody
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
      (body.magnitude !== undefined && body.magnitude !== target.magnitude) ||
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
      const existingBase = await tx.measurementUnit.findFirst({
        where: {
          magnitude: target.magnitude,
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
    if (body.magnitude !== undefined) updateData.magnitude = body.magnitude;
    if (body.baseFactor !== undefined) updateData.baseFactor = body.baseFactor;
    if (body.isBase !== undefined) updateData.isBase = body.isBase;

    const updatedMu = await tx.measurementUnit.update({
      where: { id: target.id },
      data: updateData,
    });

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
