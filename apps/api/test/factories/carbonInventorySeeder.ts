import type { PrismaClient } from "@repo/database";
import { Prisma } from "@repo/database";
import { mapBigIntField } from "@/utils/bigint.js";

/**
 * Gets a pre-seeded test user by email
 */
export async function getTestUser(
  prisma: PrismaClient,
  email: string
): Promise<{ id: bigint; email: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error(
      `Test user with email '${email}' not found in database. ` +
        "Please ensure the database is properly seeded with test users before running tests."
    );
  }

  return user;
}

/**
 * Gets multiple pre-seeded test users at once
 */
export async function getTestUsers(
  prisma: PrismaClient,
  emails: string[]
): Promise<Array<{ id: bigint; email: string }>> {
  return Promise.all(emails.map((email) => getTestUser(prisma, email)));
}

/**
 * Common carbon inventory data patterns for testing
 */
export const carbonInventoryPatterns = {
  /**
   * Returns a minimal draft carbon inventory input object with SIMPLIFIED mode.
   *   - usageMode: "SIMPLIFIED"
   */
  simplifiedDraft: (): Prisma.CarbonInventoryUncheckedCreateInput => ({
    usageMode: "SIMPLIFIED",
  }),

  /**
   * Returns a minimal draft carbon inventory input object with EXPERT mode.
   *   - usageMode: "EXPERT"
   */
  expertDraft: (): Prisma.CarbonInventoryUncheckedCreateInput => ({
    usageMode: "EXPERT",
  }),

  /**
   * Returns a submitted carbon inventory input object with SIMPLIFIED mode.
   *   - year: 2024
   *   - status: "SUBMITTED"
   *   - usageMode: "SIMPLIFIED"
   *   - isEditable: false
   */
  submitted: (): Prisma.CarbonInventoryUncheckedCreateInput => ({
    year: 2024,
    status: "SUBMITTED",
    usageMode: "SIMPLIFIED",
    isEditable: false,
  }),

  /**
   * Returns a verified carbon inventory input object with EXPERT mode.
   *   - year: 2024
   *   - status: "VERIFIED"
   *   - usageMode: "EXPERT"
   *   - isEditable: false
   */
  verified: (): Prisma.CarbonInventoryUncheckedCreateInput => ({
    year: 2024,
    status: "VERIFIED",
    usageMode: "EXPERT",
    isEditable: false,
  }),

  /**
   * Returns a deleted carbon inventory input object with SIMPLIFIED mode.
   *   - year: 2024
   *   - status: "DELETED"
   *   - usageMode: "SIMPLIFIED"
   *   - isEditable: false
   */
  deleted: (): Prisma.CarbonInventoryUncheckedCreateInput => ({
    year: 2024,
    status: "DELETED",
    usageMode: "SIMPLIFIED",
    isEditable: false,
  }),

  /**
   * Returns a complete carbon inventory input object with all fields populated.
   *   - organizationId: {organizationId}
   *   - organizationBranchId: {organizationBranchId}
   *   - organizationData: {
   *       - name: "Test Organization",
   *       - sectorId: "10",
   *       - subsectorId: "20",
   *       - sizeId: "5",
   *       - mainActivityId: "15",
   *       - mainActivityQuantity: 250,
   *     }
   *   - year: 2023
   *   - status: "VERIFIED"
   *   - usageMode: "EXPERT"
   *   - methodologyVersionId: {methodologyVersionId}
   *   - preselectedNodesId: {preselectedNodesId}
   *   - isEditable: false
   *   - createdById: {createdById}
   *   - updatedById: {updatedById}
   */
  complete: (
    organizationId: bigint,
    organizationBranchId: bigint,
    methodologyVersionId: bigint,
    preselectedNodesId: bigint,
    createdById: bigint,
    updatedById: bigint
  ): Prisma.CarbonInventoryUncheckedCreateInput => ({
    organizationId: organizationId,
    organizationBranchId: organizationBranchId,
    organizationData: {
      name: "Test Organization",
      sectorId: "10",
      subsectorId: "20",
      sizeId: "5",
      mainActivityId: "15",
      mainActivityQuantity: 250,
    },
    year: 2023,
    status: "VERIFIED",
    usageMode: "EXPERT",
    methodologyVersionId: methodologyVersionId,
    preselectedNodesId: preselectedNodesId,
    isEditable: false,
    createdById: createdById,
    updatedById: updatedById,
  }),

  /**
   * Returns a carbon inventory input object with organization data.
   *   - organizationData: {
   *       - name: "Acme Corp",
   *       - sectorId: "5",
   *       - subsectorId: "12",
   *       - sizeId: "3",
   *       - mainActivityId: "8",
   *       - mainActivityQuantity: 500,
   *     }
   *   - year: 2024
   *   - status: "DRAFT"
   *   - usageMode: "SIMPLIFIED"
   *   - isEditable: true
   */
  withOrganizationData: (
    overrides?: Partial<{
      name: string;
      sectorId: string;
      subsectorId: string;
      sizeId: string;
      mainActivityId: string;
      mainActivityQuantity: number;
    }>
  ): Prisma.CarbonInventoryUncheckedCreateInput => ({
    organizationData: {
      name: overrides?.name ?? "Acme Corp",
      sectorId: overrides?.sectorId ?? "5",
      subsectorId: overrides?.subsectorId ?? "12",
      sizeId: overrides?.sizeId ?? "3",
      mainActivityId: overrides?.mainActivityId ?? "8",
      mainActivityQuantity: overrides?.mainActivityQuantity ?? 500,
    },
    year: 2024,
    status: "DRAFT",
    usageMode: "SIMPLIFIED",
    isEditable: true,
  }),
};

/**
 * Creates a carbon inventory with the given data
 */
export async function createCarbonInventory(
  prisma: PrismaClient,
  data: Prisma.CarbonInventoryUncheckedCreateInput
) {
  return prisma.carbonInventory.create({ data });
}

/**
 * Creates multiple carbon inventories at once using a single batch operation.
 * Note: Does not return the created records. Use createCarbonInventory() if you need the returned record.
 */
export async function createCarbonInventories(
  prisma: PrismaClient,
  dataArray: Prisma.CarbonInventoryUncheckedCreateInput[]
) {
  await prisma.carbonInventory.createMany({ data: dataArray });
}

/**
 * Creates a carbon inventory using a pattern
 */
export async function createInventoryFromPattern(
  prisma: PrismaClient,
  pattern: () => Prisma.CarbonInventoryUncheckedCreateInput,
  overrides?: Partial<Prisma.CarbonInventoryUncheckedCreateInput>
) {
  const data = { ...pattern(), ...overrides };
  return createCarbonInventory(prisma, data);
}

/**
 * Seeds a carbon inventory with common defaults and optional overrides
 * This is a convenience function for test setup
 */
export async function seedCarbonInventory(
  prisma: PrismaClient,
  data: Prisma.CarbonInventoryUncheckedCreateInput
) {
  return prisma.carbonInventory.create({
    data: {
      year: data.year,
      usageMode: data.usageMode,
      status: data.status,
      isEditable: data.isEditable,
      organizationId: mapBigIntField(data.organizationId?.toString()) ?? null,
      organizationBranchId:
        mapBigIntField(data.organizationBranchId?.toString()) ?? null,
      organizationData: data.organizationData ?? Prisma.JsonNull,
      methodologyVersionId:
        mapBigIntField(data.methodologyVersionId?.toString()) ?? null,
      preselectedNodesId:
        mapBigIntField(data.preselectedNodesId?.toString()) ?? null,
      createdById: data.createdById ?? null,
      updatedById: data.updatedById ?? null,
    },
  });
}

/**
 * Cleans up test carbon inventories
 * Note: Users are seeded once and reused across tests
 */
export async function cleanupCarbonInventoryTestData(
  prisma: PrismaClient
): Promise<void> {
  await prisma.carbonInventory.deleteMany({});
}
