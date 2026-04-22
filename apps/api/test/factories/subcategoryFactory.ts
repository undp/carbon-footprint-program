import { type PrismaClient, type Subcategory } from "@repo/database";
import { SubcategoryStatus } from "@repo/types";

/**
 * Creates a test subcategory with sensible defaults.
 * Uses a random suffix to avoid unique constraint violations.
 */
export async function createTestSubcategory(
  prisma: PrismaClient,
  categoryId: bigint,
  overrides?: Partial<Subcategory>
): Promise<Subcategory> {
  const randomSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return await prisma.subcategory.create({
    data: {
      categoryId,
      name: overrides?.name ?? `Test - Subcategory ${randomSuffix}`,
      icon: overrides?.icon ?? "FACTORY",
      description: overrides?.description ?? "Test subcategory description",
      explanation: overrides?.explanation ?? null,
      status: overrides?.status ?? SubcategoryStatus.ACTIVE,
      createdById: null,
      updatedById: null,
    },
  });
}

/**
 * Creates measurement unit associations for a subcategory.
 */
export async function createTestSubcategoryUnits(
  prisma: PrismaClient,
  subcategoryId: bigint,
  measurementUnitIds: bigint[]
): Promise<void> {
  await prisma.subcategoryMeasurementUnit.createMany({
    data: measurementUnitIds.map((unitId) => ({
      subcategoryId,
      measurementUnitId: unitId,
    })),
  });
}

/**
 * Gets measurement unit IDs from the seeded test database.
 * Returns up to `count` measurement unit IDs.
 */
export async function getTestMeasurementUnitIds(
  prisma: PrismaClient,
  count: number = 2
): Promise<bigint[]> {
  const units = await prisma.measurementUnit.findMany({
    select: { id: true },
    take: count,
  });

  if (units.length === 0) {
    throw new Error(
      "No measurement units found in database. " +
        "Please ensure the database is properly seeded."
    );
  }

  return units.map((u) => u.id);
}
