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
 * Deletes in order: results -> factors -> inputs -> lines -> inventories
 */
export async function cleanupCarbonInventoryTestData(
  prisma: PrismaClient
): Promise<void> {
  // Delete in order of dependencies (child tables first)
  await prisma.carbonInventoryLineResult.deleteMany({});
  await prisma.carbonInventoryLineFactor.deleteMany({});
  await prisma.carbonInventoryLineInput.deleteMany({});
  await prisma.carbonInventoryLine.deleteMany({});
  await prisma.carbonInventory.deleteMany({});
}

/**
 * Gets the ACTIVE status ID for lines
 */
export async function getActiveStatusId(prisma: PrismaClient): Promise<bigint> {
  const activeStatus = await prisma.statusCatalog.findFirst({
    where: {
      scope: "ENTITY",
      code: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (!activeStatus) {
    throw new Error(
      "ACTIVE status not found in database. Please ensure the database is properly seeded."
    );
  }

  return activeStatus.id;
}

/**
 * Gets the DELETED status ID for lines
 */
export async function getDeletedStatusId(
  prisma: PrismaClient
): Promise<bigint> {
  const deletedStatus = await prisma.statusCatalog.findFirst({
    where: {
      scope: "ENTITY",
      code: "DELETED",
    },
    select: {
      id: true,
    },
  });

  if (!deletedStatus) {
    throw new Error(
      "DELETED status not found in database. Please ensure the database is properly seeded."
    );
  }

  return deletedStatus.id;
}

/**
 * Gets the OUTDATED status ID for lines
 */
export async function getOutdatedStatusId(
  prisma: PrismaClient
): Promise<bigint> {
  const outdatedStatus = await prisma.statusCatalog.findFirst({
    where: {
      scope: "ENTITY",
      code: "OUTDATED",
    },
    select: {
      id: true,
    },
  });

  if (!outdatedStatus) {
    throw new Error(
      "OUTDATED status not found in database. Please ensure the database is properly seeded."
    );
  }

  return outdatedStatus.id;
}

/**
 * Gets all subcategory IDs from a methodology version
 */
export async function getSubcategoryIds(
  prisma: PrismaClient,
  methodologyVersionId: bigint
): Promise<bigint[]> {
  const methodology = await prisma.methodologyVersion.findUnique({
    where: {
      id: methodologyVersionId,
    },
    select: {
      categories: {
        select: {
          subcategories: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!methodology) {
    throw new Error("Methodology not found");
  }

  return methodology.categories.flatMap((category) =>
    category.subcategories.map((subcategory) => subcategory.id)
  );
}

/**
 * Creates a carbon inventory line
 */
export async function createCarbonInventoryLine(
  prisma: PrismaClient,
  carbonInventoryId: bigint,
  subcategoryId: bigint,
  options?: {
    statusId?: bigint;
  }
) {
  const statusId = options?.statusId ?? (await getActiveStatusId(prisma));

  return prisma.carbonInventoryLine.create({
    data: {
      carbonInventoryId,
      subcategoryId,
      statusId,
    },
  });
}

/**
 * Creates a carbon inventory line input
 */
export async function createCarbonInventoryLineInput(
  prisma: PrismaClient,
  lineId: bigint,
  options?: {
    inputType?: "SIMPLIFIED" | "EXPERT" | "DIRECT";
    selection1Id?: bigint | null;
    selection2Id?: bigint | null;
    quantity?: Prisma.Decimal;
    directTotalEmissions?: Prisma.Decimal;
    manualFactor?: Prisma.Decimal;
    comment?: string;
    isActive?: boolean;
  }
) {
  return prisma.carbonInventoryLineInput.create({
    data: {
      lineId,
      inputType: options?.inputType ?? "SIMPLIFIED",
      selection1Id: options?.selection1Id ?? null,
      selection2Id: options?.selection2Id ?? null,
      quantity: options?.quantity ?? null,
      directTotalEmissions: options?.directTotalEmissions ?? null,
      manualFactor: options?.manualFactor ?? null,
      comment: options?.comment ?? null,
      isActive: options?.isActive ?? true,
    },
  });
}

/**
 * Creates a carbon inventory line result
 */
export async function createCarbonInventoryLineResult(
  prisma: PrismaClient,
  lineInputId: bigint,
  totalEmissions: number | Prisma.Decimal
) {
  return prisma.carbonInventoryLineResult.create({
    data: {
      lineInputId,
      totalEmissions:
        typeof totalEmissions === "number"
          ? new Prisma.Decimal(totalEmissions)
          : totalEmissions,
      resultDetails: {},
    },
  });
}

/**
 * Creates a complete carbon inventory with lines, inputs, and results for testing
 * This creates a ready-to-use inventory with actual emissions data
 */
export async function createInventoryWithEmissions(
  prisma: PrismaClient,
  inventoryData: Prisma.CarbonInventoryUncheckedCreateInput,
  options?: {
    emissionsByCategory?: { categoryPosition: number; emissions: number }[];
  }
) {
  // Create the inventory
  const inventory = await prisma.carbonInventory.create({
    data: inventoryData,
  });

  // Get methodology version
  const methodologyVersion = await prisma.methodologyVersion.findFirst({
    include: {
      categories: {
        include: {
          subcategories: {
            take: 1, // Take first subcategory from each category
          },
        },
      },
    },
  });

  if (!methodologyVersion) {
    throw new Error("No methodology version found for testing");
  }

  const activeStatusId = await getActiveStatusId(prisma);

  // If emissions by category specified, use those; otherwise create default emissions
  const emissionsByCategory =
    options?.emissionsByCategory ??
    methodologyVersion.categories.map((cat: any, index: number) => ({
      categoryPosition: cat.position,
      emissions: (index + 1) * 1000, // Default: 1000, 2000, 3000, etc.
    }));

  // Create lines, inputs, and results for each category
  for (const emissionConfig of emissionsByCategory) {
    const category = methodologyVersion.categories.find(
      (c: any) => c.position === emissionConfig.categoryPosition
    );

    if (!category || category.subcategories.length === 0) {
      continue;
    }

    const subcategory = category.subcategories[0];

    // Create line
    const line = await createCarbonInventoryLine(
      prisma,
      inventory.id,
      subcategory.id,
      { statusId: activeStatusId }
    );

    // Create input
    const input = await createCarbonInventoryLineInput(prisma, line.id, {
      inputType: "DIRECT",
      directTotalEmissions: new Prisma.Decimal(emissionConfig.emissions),
      isActive: true,
    });

    // Create result
    await createCarbonInventoryLineResult(
      prisma,
      input.id,
      emissionConfig.emissions
    );
  }

  return inventory;
}
