import type { Prisma } from "@repo/database";
import type { MeasurementUnit } from "@repo/database";
import {
  KgMeasurementUnitNotFoundError,
  KgMeasurementUnitImmutableError,
  BaseUnitImmutableError,
} from "./errors.js";

type TransactionClient = Prisma.TransactionClient;

export const resolveKgMeasurementUnit = async (tx: TransactionClient) => {
  const kg = await tx.measurementUnit.findUnique({
    where: { abbreviation: "kg" },
  });
  if (!kg) throw new KgMeasurementUnitNotFoundError();
  return kg;
};

export const getReferenceCount = async (
  tx: TransactionClient,
  measurementUnitId: bigint
): Promise<number> => {
  const canonicalRmu = await tx.rateMeasurementUnit.findFirst({
    where: {
      denominatorMeasurementUnitId: measurementUnitId,
      numeratorMeasurementUnit: { abbreviation: "kg" },
    },
    select: { id: true },
  });

  const directCountPromises = [
    tx.carbonInventoryLineInput.count({
      where: { measurementUnitId },
    }),
    tx.subcategoryMeasurementUnit.count({
      where: { measurementUnitId },
    }),
  ];

  const rmuCountPromises = canonicalRmu
    ? [
        tx.emissionFactor.count({
          where: { rateMeasurementUnitId: canonicalRmu.id },
        }),
        tx.carbonInventoryLineInput.count({
          where: { manualFactorRateUnitId: canonicalRmu.id },
        }),
        tx.carbonInventoryLineFactor.count({
          where: { appliedFactorRateUnitId: canonicalRmu.id },
        }),
      ]
    : [Promise.resolve(0), Promise.resolve(0), Promise.resolve(0)];

  const counts = await Promise.all([
    ...directCountPromises,
    ...rmuCountPromises,
  ]);
  return counts.reduce((sum, c) => sum + c, 0);
};

export const buildCanonicalRmuFields = (
  mu: Pick<MeasurementUnit, "abbreviation" | "name">
) => ({
  abbreviation: `kg/${mu.abbreviation}`,
  name: `kg por ${mu.name}`,
});

export const assertNotKgMu = (mu: Pick<MeasurementUnit, "abbreviation">) => {
  if (mu.abbreviation === "kg") throw new KgMeasurementUnitImmutableError();
};

export const assertNotBaseUnit = (mu: Pick<MeasurementUnit, "isBase">) => {
  if (mu.isBase) throw new BaseUnitImmutableError();
};
