import { type PrismaClient, Prisma } from "@repo/database";
import { CarbonInventoryLineStatus } from "@repo/types";
import { mapBigIntField } from "@/utils/bigint.js";
import { getTestLoggedUser } from "./userFactory.js";

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
    createdById: bigint
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
  rawData: Prisma.CarbonInventoryUncheckedCreateInput
) {
  const { id } = await getTestLoggedUser(prisma);

  const data = {
    ...rawData,
    createdById: rawData.createdById ?? id,
    updatedAt: null,
  };

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
  const { id } = await getTestLoggedUser(prisma);

  const dataWithUserIds = dataArray.map((rawData) => ({
    ...rawData,
    createdById: rawData.createdById ?? id,
  }));
  await prisma.carbonInventory.createMany({ data: dataWithUserIds });
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
      updatedAt: null,
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
    status?: CarbonInventoryLineStatus;
  }
) {
  return prisma.carbonInventoryLine.create({
    data: {
      carbonInventoryId,
      subcategoryId,
      status: options?.status ?? CarbonInventoryLineStatus.ACTIVE,
      updatedAt: null,
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
      updatedAt: null,
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
      updatedAt: null,
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
    data: {
      ...inventoryData,
      updatedAt: null,
    },
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

  // If emissions by category specified, use those; otherwise create default emissions
  const emissionsByCategory =
    options?.emissionsByCategory ??
    methodologyVersion.categories.map((cat, index: number) => ({
      categoryPosition: cat.position,
      emissions: (index + 1) * 1000, // Default: 1000, 2000, 3000, etc.
    }));

  // Create lines, inputs, and results for each category
  for (const emissionConfig of emissionsByCategory) {
    const category = methodologyVersion.categories.find(
      (c) => c.position === emissionConfig.categoryPosition
    );

    if (!category) {
      throw new Error(
        `Category with position ${emissionConfig.categoryPosition} not found in methodology version`
      );
    }

    if (category.subcategories.length === 0) {
      throw new Error(
        `Category at position ${emissionConfig.categoryPosition} has no subcategories`
      );
    }

    const subcategory = category.subcategories[0];

    // Create line
    const line = await createCarbonInventoryLine(
      prisma,
      inventory.id,
      subcategory.id,
      { status: CarbonInventoryLineStatus.ACTIVE }
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
