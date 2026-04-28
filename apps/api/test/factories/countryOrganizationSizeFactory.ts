import {
  type PrismaClient,
  type CountryOrganizationSize,
  CountryOrganizationSizeStatus,
} from "@repo/database";
import { getTestCountryId } from "./methodologyFactory.js";

/**
 * Override shape for `createTestCountryOrganizationSize`. The `status` field is typed
 * against the per-table enum so callers must pass
 * `CountryOrganizationSizeStatus.ACTIVE | DELETED` — never a raw string literal.
 */
export interface CreateTestCountryOrganizationSizeOverrides {
  countryId?: bigint;
  name?: string;
  description?: string | null;
  position?: number;
  status?: CountryOrganizationSizeStatus;
  createdById?: bigint | null;
  updatedById?: bigint | null;
}

/**
 * Creates a test country organization size with sensible defaults.
 */
export async function createTestCountryOrganizationSize(
  prisma: PrismaClient,
  overrides?: CreateTestCountryOrganizationSizeOverrides
): Promise<CountryOrganizationSize> {
  const countryId = overrides?.countryId ?? (await getTestCountryId(prisma));
  const randomSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  let position = overrides?.position;
  if (position === undefined) {
    const aggregate = await prisma.countryOrganizationSize.aggregate({
      where: { countryId },
      _max: { position: true },
    });
    position = (aggregate._max.position ?? 0) + 1;
  }

  return await prisma.countryOrganizationSize.create({
    data: {
      countryId,
      name: overrides?.name ?? `Test - Size ${randomSuffix}`,
      description: overrides?.description ?? null,
      position,
      status: overrides?.status ?? CountryOrganizationSizeStatus.ACTIVE,
      createdById: overrides?.createdById ?? null,
      updatedById: overrides?.updatedById ?? null,
      updatedAt: null,
    },
  });
}
