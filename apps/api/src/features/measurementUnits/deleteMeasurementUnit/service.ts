import { type PrismaClient, MeasurementUnitStatus } from "@repo/database";
import type { User } from "@repo/types";
import { DataIntegrityError } from "@/errors/index.js";
import {
  resolveKgMeasurementUnit,
  assertNotKgMu,
  assertNotBaseUnit,
} from "../helpers.js";
import { MeasurementUnitNotFoundError } from "../errors.js";

export const deleteMeasurementUnitService = async (
  prismaClient: PrismaClient,
  id: string,
  _user: User | null
): Promise<void> => {
  return await prismaClient.$transaction(async (tx) => {
    const target = await tx.measurementUnit.findUnique({
      where: { id: BigInt(id), status: MeasurementUnitStatus.ACTIVE },
    });

    if (!target) {
      throw new MeasurementUnitNotFoundError(id);
    }

    assertNotKgMu(target);
    assertNotBaseUnit(target);

    const kg = await resolveKgMeasurementUnit(tx);

    const { count: updatedRows } = await tx.rateMeasurementUnit.updateMany({
      where: {
        denominatorMeasurementUnitId: target.id,
        numeratorMeasurementUnitId: kg.id,
        status: MeasurementUnitStatus.ACTIVE,
      },
      data: { status: MeasurementUnitStatus.DELETED },
    });

    if (updatedRows !== 1)
      throw new DataIntegrityError(
        `Failed to soft-delete canonical RMU for MeasurementUnit id=${target.id} abbreviation="${target.abbreviation}". Expected to update 1 row, but updated ${updatedRows}.`
      );

    await tx.measurementUnit.update({
      where: { id: target.id },
      data: { status: MeasurementUnitStatus.DELETED },
    });
  });
};
