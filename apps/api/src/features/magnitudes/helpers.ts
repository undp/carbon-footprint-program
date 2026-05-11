import type { Prisma } from "@repo/database";
import type { Magnitude } from "@repo/database";
import { MagnitudeIsSystemError } from "./errors.js";

type TransactionClient = Prisma.TransactionClient;

/**
 * Counts every MeasurementUnit that holds an FK to the given magnitude regardless of
 * MU status — historical (DELETED) MUs still hold the FK and prevent magnitude deletion.
 */
export const getMagnitudeReferenceCount = async (
  tx: TransactionClient,
  magnitudeId: bigint
): Promise<number> => tx.measurementUnit.count({ where: { magnitudeId } });

export const assertMagnitudeNotSystem = (
  magnitude: Pick<Magnitude, "isSystem">
) => {
  if (magnitude.isSystem) throw new MagnitudeIsSystemError();
};
