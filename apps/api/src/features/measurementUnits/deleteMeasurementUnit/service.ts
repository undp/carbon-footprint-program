import { type PrismaClient, MeasurementUnitStatus } from "@repo/database";
import type { User } from "@repo/types";
import { DataIntegrityError } from "@/errors/index.js";
import {
  resolveKgMeasurementUnit,
  assertNotKgMu,
  assertNotBaseUnit,
  getReferenceCount,
} from "../helpers.js";
import {
  MeasurementUnitNotFoundError,
  MeasurementUnitReferencedError,
} from "../errors.js";

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

    // Same reference count the list endpoint surfaces and the edit guard uses,
    // so a unit the UI shows as "in use" cannot be deleted through the API
    // either. Checked inside the transaction to avoid a TOCTOU race.
    const refCount = await getReferenceCount(tx, target.id);
    if (refCount > 0) {
      throw new MeasurementUnitReferencedError();
    }

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
