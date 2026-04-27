import {
  type PrismaClient,
  type CountrySector,
  CountrySectorStatus,
} from "@repo/database";
import { getTestCountryId } from "./methodologyFactory.js";

/**
 * Override shape for `createTestCountrySector`. The `status` field is typed against the
 * per-table enum so callers must pass `CountrySectorStatus.ACTIVE | DELETED` and never a
 * raw string literal — keeps tests aligned with the per-table enum convention.
 */
export interface CreateTestCountrySectorOverrides {
  countryId?: bigint;
  name?: string;
  description?: string | null;
  status?: CountrySectorStatus;
  createdById?: bigint | null;
  updatedById?: bigint | null;
}

/**
 * Creates a test country sector with sensible defaults. Uses a random suffix to avoid
 * unique-constraint collisions (the partial unique index covers the ACTIVE scope).
 */
export async function createTestCountrySector(
  prisma: PrismaClient,
  overrides?: CreateTestCountrySectorOverrides
): Promise<CountrySector> {
  const countryId = overrides?.countryId ?? (await getTestCountryId(prisma));
  const randomSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return await prisma.countrySector.create({
    data: {
      countryId,
      name: overrides?.name ?? `Test - Sector ${randomSuffix}`,
      description: overrides?.description ?? null,
      status: overrides?.status ?? CountrySectorStatus.ACTIVE,
      createdById: overrides?.createdById ?? null,
      updatedById: overrides?.updatedById ?? null,
      updatedAt: null,
    },
  });
}
