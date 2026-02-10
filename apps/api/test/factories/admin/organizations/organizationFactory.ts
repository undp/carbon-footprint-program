import type { PrismaClient, OrganizationStatus } from "@repo/database";

export async function createOrganization(
  prisma: PrismaClient,
  countryId: bigint,
  overrides?: {
    status?: OrganizationStatus;
    createdById?: bigint | null;
    updatedById?: bigint | null;
  }
) {
  return await prisma.organization.create({
    data: {
      countryId,
      status: overrides?.status ?? "NOT_ACCREDITED",
      createdById: overrides?.createdById,
      updatedById: overrides?.updatedById,
    },
  });
}

/**
 * Removes all test organizations and their dependencies
 *
 * Uses marker-based cleanup to only delete organizations that have
 * organizationData with TEST_ prefixes. This ensures seed data and
 * other organizations are never accidentally deleted.
 *
 * Deletes in reverse dependency order:
 * 1. Submissions
 * 2. SubmissionSubjects
 * 3. Carbon inventories
 * 4. User organization memberships
 * 5. Organization data
 * 6. Organizations
 *
 * @param prisma - Prisma client instance
 *
 * @example
 * beforeEach(async () => {
 *   await cleanupTestOrganizations(prisma);
 * });
 */
export async function cleanupTestOrganizations(
  prisma: PrismaClient
): Promise<void> {
  // First, find all test organization IDs by querying organizationData
  // with TEST_ markers
  const testOrgData = await prisma.organizationData.findMany({
    where: {
      OR: [
        { legalName: { startsWith: "TEST_" } },
        { taxId: { startsWith: "TEST_" } },
        { representativeEmail: { startsWith: "TEST_" } },
      ],
    },
    select: { organizationId: true },
  });

  const testOrgIds = [
    ...new Set(testOrgData.map((data) => data.organizationId)),
  ];

  if (testOrgIds.length === 0) {
    // No test organizations to clean up
    return;
  }

  // Delete children first, then parents
  // Level 3: Deep children (submissions)
  await prisma.submission.deleteMany({
    where: {
      subject: {
        organizationData: {
          organizationData: {
            organizationId: { in: testOrgIds },
          },
        },
      },
    },
  });

  // Level 2: Submission subjects
  await prisma.submissionSubjectOrganizationData.deleteMany({
    where: {
      organizationData: {
        organizationId: { in: testOrgIds },
      },
    },
  });

  await prisma.submissionSubject.deleteMany({
    where: {
      organizationData: {
        organizationData: {
          organizationId: { in: testOrgIds },
        },
      },
    },
  });

  // Level 1: Direct children
  await prisma.carbonInventory.deleteMany({
    where: {
      organizationId: { in: testOrgIds },
    },
  });

  await prisma.userOrganizationMembership.deleteMany({
    where: {
      organizationId: { in: testOrgIds },
    },
  });

  await prisma.organizationData.deleteMany({
    where: {
      organizationId: { in: testOrgIds },
    },
  });

  // Level 0: Parents
  await prisma.organization.deleteMany({
    where: {
      id: { in: testOrgIds },
    },
  });
}

export async function getTestOrganizationId(
  prisma: PrismaClient
): Promise<bigint> {
  const organization = await prisma.organization.findFirst({
    select: { id: true },
  });

  if (!organization) {
    throw new Error(
      "No organization found in database. Please ensure the database is properly seeded."
    );
  }

  return organization.id;
}
