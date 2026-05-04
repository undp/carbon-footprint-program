import { type PrismaClient, Prisma } from "@repo/database";
import {
  CarbonInventoryLineStatus,
  type OrganizationDataField,
} from "@repo/types";
import { mapBigIntField } from "@/utils/bigint.js";
import { getTestLoggedUser } from "./userFactory.js";
import { getTestMethodologyVersionId } from "./methodologyFactory.js";

type CarbonInventoryCreateData = Omit<
  Prisma.CarbonInventoryUncheckedCreateInput,
  "methodologyVersionId"
> & { methodologyVersionId?: bigint | number };

/**
 * Common carbon inventory data patterns for testing
 */
export const carbonInventoryPatterns = {
  /**
   * Returns a minimal draft carbon inventory input object with SIMPLIFIED mode.
   *   - usageMode: "SIMPLIFIED"
   */
  simplifiedDraft: (): CarbonInventoryCreateData => ({
    usageMode: "SIMPLIFIED",
  }),

  /**
   * Returns a minimal draft carbon inventory input object with EXPERT mode.
   *   - usageMode: "EXPERT"
   */
  expertDraft: (): CarbonInventoryCreateData => ({
    usageMode: "EXPERT",
  }),

  /**
   * Returns a complete carbon inventory input object with all fields populated.
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
    usageMode: "EXPERT",
    methodologyVersionId: methodologyVersionId,
    preselectedNodesId: preselectedNodesId,
    isEditable: false,
    createdById: createdById,
  }),

  /**
   * Returns a carbon inventory input object with organization data.
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
  ): CarbonInventoryCreateData => ({
    organizationData: {
      name: overrides?.name ?? "Acme Corp",
      sectorId: overrides?.sectorId ?? "5",
      subsectorId: overrides?.subsectorId ?? "12",
      sizeId: overrides?.sizeId ?? "3",
      mainActivityId: overrides?.mainActivityId ?? "8",
      mainActivityQuantity: overrides?.mainActivityQuantity ?? 500,
    },
    year: 2024,
    usageMode: "SIMPLIFIED",
    isEditable: true,
  }),
};

/**
 * Builds the expected `organizationData` response shape, including the
 * `sector`/`subsector`/`size`/`mainActivity` reference fields the API always
 * emits.
 *
 * - With `resolveReferences: true` (default): looks up the catalog rows by the
 *   *Id fields and includes the `{id, name}` snapshots — for endpoints that
 *   resolve references (getById, update).
 * - With `resolveReferences: false`: leaves the reference fields as `null` —
 *   for endpoints that don't resolve them (getAll currently does not, and the
 *   FE list views don't consume those fields).
 */
export async function buildExpectedOrganizationData(
  prisma: PrismaClient,
  input: NonNullable<OrganizationDataField>,
  { resolveReferences = true }: { resolveReferences?: boolean } = {}
): Promise<NonNullable<OrganizationDataField>> {
  if (!resolveReferences) {
    return {
      ...input,
      sector: null,
      subsector: null,
      size: null,
      mainActivity: null,
    };
  }

  const [sector, subsector, size, mainActivity] = await Promise.all([
    input.sectorId
      ? prisma.countrySector.findUnique({
          where: { id: BigInt(input.sectorId) },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    input.subsectorId
      ? prisma.countrySubsector.findUnique({
          where: { id: BigInt(input.subsectorId) },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    input.sizeId
      ? prisma.countryOrganizationSize.findUnique({
          where: { id: BigInt(input.sizeId) },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    input.mainActivityId
      ? prisma.organizationMainActivity.findUnique({
          where: { id: BigInt(input.mainActivityId) },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    ...input,
    sector: sector ? { id: sector.id.toString(), name: sector.name } : null,
    subsector: subsector
      ? { id: subsector.id.toString(), name: subsector.name }
      : null,
    size: size ? { id: size.id.toString(), name: size.name } : null,
    mainActivity: mainActivity
      ? { id: mainActivity.id.toString(), name: mainActivity.name }
      : null,
  };
}

/**
 * Creates a carbon inventory with the given data
 */
export async function createCarbonInventory(
  prisma: PrismaClient,
  rawData: CarbonInventoryCreateData
) {
  const { id } = await getTestLoggedUser(prisma);
  const methodologyVersionId =
    rawData.methodologyVersionId ?? (await getTestMethodologyVersionId(prisma));

  const data: Prisma.CarbonInventoryUncheckedCreateInput = {
    ...rawData,
    methodologyVersionId,
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
  dataArray: CarbonInventoryCreateData[]
) {
  const { id } = await getTestLoggedUser(prisma);
  const methodologyVersionId = await getTestMethodologyVersionId(prisma);

  const dataWithDefaults = dataArray.map((rawData) => ({
    ...rawData,
    methodologyVersionId: rawData.methodologyVersionId ?? methodologyVersionId,
    createdById: rawData.createdById ?? id,
  }));
  await prisma.carbonInventory.createMany({ data: dataWithDefaults });
}

/**
 * Creates a carbon inventory using a pattern
 */
export async function createInventoryFromPattern(
  prisma: PrismaClient,
  pattern: (() => CarbonInventoryCreateData) | CarbonInventoryCreateData,
  overrides?: Partial<CarbonInventoryCreateData>
) {
  const base = typeof pattern === "function" ? pattern() : pattern;
  const data = { ...base, ...overrides };
  return createCarbonInventory(prisma, data);
}

/**
 * Seeds a carbon inventory with common defaults and optional overrides
 * This is a convenience function for test setup
 */
export async function seedCarbonInventory(
  prisma: PrismaClient,
  data: CarbonInventoryCreateData
) {
  const { id } = await getTestLoggedUser(prisma);
  const defaultMethodologyVersionId = await getTestMethodologyVersionId(prisma);
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
        mapBigIntField(data.methodologyVersionId?.toString()) ??
        defaultMethodologyVersionId,
      preselectedNodesId:
        mapBigIntField(data.preselectedNodesId?.toString()) ?? null,
      createdById: data.createdById ?? id,
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
  const { id } = await getTestLoggedUser(prisma);
  return prisma.carbonInventoryLine.create({
    data: {
      carbonInventoryId,
      subcategoryId,
      status: options?.status ?? CarbonInventoryLineStatus.ACTIVE,
      createdById: id,
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
  const { id } = await getTestLoggedUser(prisma);
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
      createdById: id,
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
  const { id } = await getTestLoggedUser(prisma);
  return prisma.carbonInventoryLineResult.create({
    data: {
      lineInputId,
      totalEmissions:
        typeof totalEmissions === "number"
          ? new Prisma.Decimal(totalEmissions)
          : totalEmissions,
      resultDetails: {},
      createdById: id,
      updatedAt: null,
    },
  });
}

/**
 * Creates a carbon inventory line factor
 */
export async function createCarbonInventoryLineFactor(
  prisma: PrismaClient,
  lineInputId: bigint,
  options: {
    appliedFactorValue: Prisma.Decimal;
    appliedFactorRateUnitId: bigint;
    emissionFactorId?: bigint | null;
    appliedFactorSource?: string | null;
    derivationDetails?: Prisma.InputJsonValue;
  }
) {
  const { id } = await getTestLoggedUser(prisma);
  return prisma.carbonInventoryLineFactor.create({
    data: {
      lineInputId,
      appliedFactorValue: options.appliedFactorValue,
      appliedFactorRateUnitId: options.appliedFactorRateUnitId,
      emissionFactorId: options.emissionFactorId ?? null,
      appliedFactorSource: options.appliedFactorSource ?? null,
      derivationDetails: options.derivationDetails ?? undefined,
      createdById: id,
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
  inventoryData: CarbonInventoryCreateData,
  options?: {
    emissionsByCategory?: { categoryPosition: number; emissions: number }[];
  }
) {
  // Create the inventory
  const { id } = await getTestLoggedUser(prisma);
  const methodologyVersionId =
    inventoryData.methodologyVersionId ??
    (await getTestMethodologyVersionId(prisma));
  const inventory = await prisma.carbonInventory.create({
    data: {
      ...inventoryData,
      methodologyVersionId,
      createdById: id,
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
