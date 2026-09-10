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

  // Positions are unique per category, so default to appending last. Counting
  // DELETED rows too keeps the generated position free even when a test has
  // soft-deleted a sibling.
  //
  // Read and write are wrapped in a transaction that locks the parent category
  // first, exactly like createSubcategory: without it two factory calls for the
  // same category — `Promise.all([createTestSubcategory(…), …])` — both read
  // the same max and the partial unique index rejects the loser with an opaque
  // P2002 about a field the test never set.
  return await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "category" WHERE "id" = ${categoryId} FOR UPDATE`;

    const { _max } = await tx.subcategory.aggregate({
      where: { categoryId },
      _max: { position: true },
    });

    return await tx.subcategory.create({
      data: {
        categoryId,
        name: overrides?.name ?? `Test - Subcategory ${randomSuffix}`,
        icon: overrides?.icon ?? "FACTORY",
        description: overrides?.description ?? "Test subcategory description",
        explanation: overrides?.explanation ?? null,
        position: overrides?.position ?? (_max.position ?? 0) + 1,
        status: overrides?.status ?? SubcategoryStatus.ACTIVE,
        createdById: null,
        updatedById: null,
      },
    });
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
