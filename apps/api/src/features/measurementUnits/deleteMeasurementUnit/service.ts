import { type PrismaClient, MeasurementUnitStatus } from "@repo/database";
import type { DeleteMeasurementUnitResponse } from "@repo/types";
import { DataIntegrityError } from "@/errors/index.js";
import {
  resolveKgMeasurementUnit,
  assertNotKgMu,
  assertNotBaseUnit,
} from "../helpers.js";
import { MeasurementUnitNotFoundError } from "../errors.js";

export const deleteMeasurementUnitService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<DeleteMeasurementUnitResponse> => {
  return await prismaClient.$transaction(async (tx) => {
    const target = await tx.measurementUnit.findUnique({
      where: { id: BigInt(id) },
    });

    if (!target || target.status === MeasurementUnitStatus.DELETED) {
      throw new MeasurementUnitNotFoundError(id);
    }

    assertNotKgMu(target);
    assertNotBaseUnit(target);

    const kg = await resolveKgMeasurementUnit(tx);

    const canonicalRmu = await tx.rateMeasurementUnit.findFirst({
      where: {
        denominatorMeasurementUnitId: target.id,
        numeratorMeasurementUnitId: kg.id,
      },
    });

    if (!canonicalRmu) {
      throw new DataIntegrityError(
        `No canonical RMU found for MeasurementUnit id=${target.id} abbreviation="${target.abbreviation}" during soft-delete`
      );
    }

    if (canonicalRmu.status === MeasurementUnitStatus.ACTIVE) {
      await tx.rateMeasurementUnit.update({
        where: { id: canonicalRmu.id },
        data: { status: MeasurementUnitStatus.DELETED },
      });
    }

    const deletedMu = await tx.measurementUnit.update({
      where: { id: target.id },
      data: { status: MeasurementUnitStatus.DELETED },
    });

    return {
      id: deletedMu.id.toString(),
      status: deletedMu.status,
    };
  });
};
