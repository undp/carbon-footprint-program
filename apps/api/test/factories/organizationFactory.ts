import type { PrismaClient } from "@repo/database";
import { getTestCountryId } from "./methodologyFactory.js";
import { OrganizationStatus } from "@repo/types";

/**
 * Creates a test organization with default values
 * This is useful for tests that need an existing organization with ACCREDITED status
 */
export async function createTestOrganization(
  prisma: PrismaClient,
  options?: {
    countryId?: bigint;
    status?: OrganizationStatus;
  }
): Promise<{ id: bigint; countryId: bigint; status: string }> {
  const countryId = options?.countryId ?? (await getTestCountryId(prisma));

  return await prisma.organization.create({
    data: {
      countryId,
      status: options?.status ?? OrganizationStatus.ACCREDITED,
    },
  });
}

/**
 * Cleans up test organizations from the database
 * Note: This should be called in test cleanup to ensure a clean state
 */
export async function cleanupOrganizations(
  prisma: PrismaClient
): Promise<void> {
  await prisma.organization.deleteMany({});
}
