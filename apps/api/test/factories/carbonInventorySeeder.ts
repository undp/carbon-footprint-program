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
   *   - usage_mode: "SIMPLIFIED"
   */
  simplifiedDraft: (): Prisma.carbon_inventoryUncheckedCreateInput => ({
    usage_mode: "SIMPLIFIED",
  }),

  /**
   * Returns a minimal draft carbon inventory input object with EXPERT mode.
   *   - usage_mode: "EXPERT"
   */
  expertDraft: (): Prisma.carbon_inventoryUncheckedCreateInput => ({
    usage_mode: "EXPERT",
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
 * Creates multiple carbon inventories at once using a single batch operation.
 * Note: Does not return the created records. Use createCarbonInventory() if you need the returned record.
 */
export async function createCarbonInventories(
  prisma: PrismaClient,
  dataArray: Prisma.carbon_inventoryUncheckedCreateInput[]
) {
  await prisma.carbon_inventory.createMany({ data: dataArray });
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
 * Seeds a carbon inventory with common defaults and optional overrides
 * This is a convenience function for test setup
 */
export async function seedCarbonInventory(
  prisma: PrismaClient,
  data: Prisma.carbon_inventoryUncheckedCreateInput
) {
  return prisma.carbon_inventory.create({
    data: {
      year: data.year,
      usage_mode: data.usage_mode,
      status: data.status,
      is_editable: data.is_editable,
      organization_id: mapBigIntField(data.organization_id?.toString()) ?? null,
      organization_branch_id:
        mapBigIntField(data.organization_branch_id?.toString()) ?? null,
      organization_data: data.organization_data ?? Prisma.JsonNull,
      methodology_version_id:
        mapBigIntField(data.methodology_version_id?.toString()) ?? null,
      preselected_nodes_id:
        mapBigIntField(data.preselected_nodes_id?.toString()) ?? null,
      created_by_id: data.created_by_id ?? null,
      updated_by_id: data.updated_by_id ?? null,
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
  await prisma.carbon_inventory.deleteMany({});
}
