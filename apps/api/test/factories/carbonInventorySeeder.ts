import type { PrismaClient } from "@repo/database";
import type { Prisma } from "@repo/database";

/**
 * Creates a test user with the given email
 */
export async function createTestUser(
  prisma: PrismaClient,
  email: string
): Promise<{ id: bigint; email: string }> {
  const jobPosition = await prisma.country_job_position.findFirst();

  if (!jobPosition) {
    throw new Error(
      "Cannot create test user: No country_job_position records found in database. " +
        "Please ensure the database is properly seeded before running tests."
    );
  }

  return prisma.user.create({
    data: {
      email,
      country_job_position_id: jobPosition.id,
    },
  });
}

/**
 * Creates multiple test users at once
 */
export async function createTestUsers(
  prisma: PrismaClient,
  emails: string[]
): Promise<Array<{ id: bigint; email: string }>> {
  return Promise.all(emails.map((email) => createTestUser(prisma, email)));
}

/**
 * Common carbon inventory data patterns for testing
 */
export const carbonInventoryPatterns = {
  /**
   * Returns a minimal draft carbon inventory input object with SIMPLIFIED mode.
   *   - year: 2024
   *   - status: "DRAFT"
   *   - usage_mode: "SIMPLIFIED"
   *   - is_editable: true
   */
  simplifiedDraft: (): Prisma.carbon_inventoryUncheckedCreateInput => ({
    year: 2024,
    status: "DRAFT",
    usage_mode: "SIMPLIFIED",
    is_editable: true,
  }),

  /**
   * Returns a minimal draft carbon inventory input object with EXPERT mode.
   *   - year: 2024
   *   - status: "DRAFT"
   *   - usage_mode: "EXPERT"
   *   - is_editable: true
   */
  expertDraft: (): Prisma.carbon_inventoryUncheckedCreateInput => ({
    year: 2024,
    status: "DRAFT",
    usage_mode: "EXPERT",
    is_editable: true,
  }),

  /**
   * Returns a submitted carbon inventory input object with SIMPLIFIED mode.
   *   - year: 2024
   *   - status: "SUBMITTED"
   *   - usage_mode: "SIMPLIFIED"
   *   - is_editable: false
   */
  submitted: (): Prisma.carbon_inventoryUncheckedCreateInput => ({
    year: 2024,
    status: "SUBMITTED",
    usage_mode: "SIMPLIFIED",
    is_editable: false,
  }),

  /**
   * Returns a verified carbon inventory input object with EXPERT mode.
   *   - year: 2024
   *   - status: "VERIFIED"
   *   - usage_mode: "EXPERT"
   *   - is_editable: false
   */
  verified: (): Prisma.carbon_inventoryUncheckedCreateInput => ({
    year: 2024,
    status: "VERIFIED",
    usage_mode: "EXPERT",
    is_editable: false,
  }),

  /**
   * Returns a deleted carbon inventory input object with SIMPLIFIED mode.
   *   - year: 2024
   *   - status: "DELETED"
   *   - usage_mode: "SIMPLIFIED"
   *   - is_editable: false
   */
  deleted: (): Prisma.carbon_inventoryUncheckedCreateInput => ({
    year: 2024,
    status: "DELETED",
    usage_mode: "SIMPLIFIED",
    is_editable: false,
  }),

  /**
   * Returns a complete carbon inventory input object with all fields populated.
   *   - organization_id: {organizationId}
   *   - organization_branch_id: {organizationBranchId}
   *   - organization_data: {
   *       - name: "Test Organization",
   *       - sectorId: "10",
   *       - subsectorId: "20",
   *       - sizeId: "5",
   *       - mainActivityId: "15",
   *       - mainActivityQuantity: 250,
   *     }
   *   - year: 2023
   *   - status: "VERIFIED"
   *   - usage_mode: "EXPERT"
   *   - methodology_version_id: {methodologyVersionId}
   *   - preselected_nodes_id: {preselectedNodesId}
   *   - is_editable: false
   *   - created_by_id: {createdById}
   *   - updated_by_id: {updatedById}
   */
  complete: (
    organizationId: bigint,
    organizationBranchId: bigint,
    methodologyVersionId: bigint,
    preselectedNodesId: bigint,
    createdById: bigint,
    updatedById: bigint
  ): Prisma.carbon_inventoryUncheckedCreateInput => ({
    organization_id: organizationId,
    organization_branch_id: organizationBranchId,
    organization_data: {
      name: "Test Organization",
      sectorId: "10",
      subsectorId: "20",
      sizeId: "5",
      mainActivityId: "15",
      mainActivityQuantity: 250,
    },
    year: 2023,
    status: "VERIFIED",
    usage_mode: "EXPERT",
    methodology_version_id: methodologyVersionId,
    preselected_nodes_id: preselectedNodesId,
    is_editable: false,
    created_by_id: createdById,
    updated_by_id: updatedById,
  }),

  /**
   * Returns a carbon inventory input object with organization data.
   *   - organization_data: {
   *       - name: "Acme Corp",
   *       - sectorId: "5",
   *       - subsectorId: "12",
   *       - sizeId: "3",
   *       - mainActivityId: "8",
   *       - mainActivityQuantity: 500,
   *     }
   *   - year: 2024
   *   - status: "DRAFT"
   *   - usage_mode: "SIMPLIFIED"
   *   - is_editable: true
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
  ): Prisma.carbon_inventoryUncheckedCreateInput => ({
    organization_data: {
      name: overrides?.name ?? "Acme Corp",
      sectorId: overrides?.sectorId ?? "5",
      subsectorId: overrides?.subsectorId ?? "12",
      sizeId: overrides?.sizeId ?? "3",
      mainActivityId: overrides?.mainActivityId ?? "8",
      mainActivityQuantity: overrides?.mainActivityQuantity ?? 500,
    },
    year: 2024,
    status: "DRAFT",
    usage_mode: "SIMPLIFIED",
    is_editable: true,
  }),
};

/**
 * Creates a carbon inventory with the given data
 */
export async function createCarbonInventory(
  prisma: PrismaClient,
  data: Prisma.carbon_inventoryUncheckedCreateInput
) {
  return prisma.carbon_inventory.create({ data });
}

/**
 * Creates multiple carbon inventories at once
 */
export async function createCarbonInventories(
  prisma: PrismaClient,
  dataArray: Prisma.carbon_inventoryUncheckedCreateInput[]
) {
  return Promise.all(
    dataArray.map((data) => prisma.carbon_inventory.create({ data }))
  );
}

/**
 * Creates a carbon inventory using a pattern
 */
export async function createInventoryFromPattern(
  prisma: PrismaClient,
  pattern: () => Prisma.carbon_inventoryUncheckedCreateInput,
  overrides?: Partial<Prisma.carbon_inventoryUncheckedCreateInput>
) {
  const data = { ...pattern(), ...overrides };
  return createCarbonInventory(prisma, data);
}

/**
 * Cleans up test carbon inventories and users
 */
export async function cleanupTestData(prisma: PrismaClient): Promise<void> {
  await prisma.carbon_inventory.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: "@test.com",
      },
    },
  });
}
