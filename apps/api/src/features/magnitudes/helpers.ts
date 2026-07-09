import type { Prisma } from "@repo/database";
import { type Magnitude, MeasurementUnitStatus } from "@repo/database";
import { MagnitudeIsSystemError } from "./errors.js";

type TransactionClient = Prisma.TransactionClient;

export const getMagnitudeReferenceCount = async (
  tx: TransactionClient,
  magnitudeId: bigint
): Promise<number> =>
  tx.measurementUnit.count({
    where: { magnitudeId, status: MeasurementUnitStatus.ACTIVE },
  });

export const assertMagnitudeNotSystem = (
  magnitude: Pick<Magnitude, "isSystem">
) => {
  if (magnitude.isSystem) throw new MagnitudeIsSystemError();
};
