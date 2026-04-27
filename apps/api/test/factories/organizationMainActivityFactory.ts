import {
  type PrismaClient,
  type OrganizationMainActivity,
  OrganizationMainActivityStatus,
} from "@repo/database";

/**
 * Override shape for `createTestOrganizationMainActivity`. The `status` field is typed
 * against the per-table enum so callers must pass `OrganizationMainActivityStatus.ACTIVE |
 * DELETED` — never a raw string literal.
 */
export interface CreateTestOrganizationMainActivityOverrides {
  name?: string;
  description?: string | null;
  status?: OrganizationMainActivityStatus;
  countrySectorId?: bigint | null;
  countrySubsectorId?: bigint | null;
  createdById?: bigint | null;
  updatedById?: bigint | null;
}

/**
 * Creates a test organization main activity with sensible defaults. Both `countrySectorId`
 * and `countrySubsectorId` default to `null` (unparented). Callers pass the desired
 * parents explicitly.
 */
export async function createTestOrganizationMainActivity(
  prisma: PrismaClient,
  overrides?: CreateTestOrganizationMainActivityOverrides
): Promise<OrganizationMainActivity> {
  const randomSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return await prisma.organizationMainActivity.create({
    data: {
      name: overrides?.name ?? `Test - Main Activity ${randomSuffix}`,
      description: overrides?.description ?? null,
      status: overrides?.status ?? OrganizationMainActivityStatus.ACTIVE,
      countrySectorId: overrides?.countrySectorId ?? null,
      countrySubsectorId: overrides?.countrySubsectorId ?? null,
      createdById: overrides?.createdById ?? null,
      updatedById: overrides?.updatedById ?? null,
      updatedAt: null,
    },
  });
}
