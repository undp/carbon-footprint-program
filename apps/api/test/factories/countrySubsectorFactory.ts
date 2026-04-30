import {
  type PrismaClient,
  type CountrySubsector,
  CountrySubsectorStatus,
} from "@repo/database";

/**
 * Override shape for `createTestCountrySubsector`. The `status` field is typed against the
 * per-table enum so callers must pass `CountrySubsectorStatus.ACTIVE | DELETED` — never a
 * raw string literal.
 */
export interface CreateTestCountrySubsectorOverrides {
  name?: string;
  description?: string | null;
  status?: CountrySubsectorStatus;
  createdById?: bigint | null;
  updatedById?: bigint | null;
}

/**
 * Creates a test country subsector under the given parent sector with sensible defaults.
 */
export async function createTestCountrySubsector(
  prisma: PrismaClient,
  countrySectorId: bigint,
  overrides?: CreateTestCountrySubsectorOverrides
): Promise<CountrySubsector> {
  const randomSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return await prisma.countrySubsector.create({
    data: {
      countrySectorId,
      name: overrides?.name ?? `Test - Subsector ${randomSuffix}`,
      description: overrides?.description ?? null,
      status: overrides?.status ?? CountrySubsectorStatus.ACTIVE,
      createdById: overrides?.createdById ?? null,
      updatedById: overrides?.updatedById ?? null,
      updatedAt: null,
    },
  });
}
