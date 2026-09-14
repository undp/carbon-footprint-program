import { type PrismaClient, type Category } from "@repo/database";
import { CategoryStatus } from "@repo/types";

/**
 * Creates a test category with sensible defaults.
 * Uses a random suffix to avoid unique constraint violations.
 */
export async function createTestCategory(
  prisma: PrismaClient,
  methodologyVersionId: bigint,
  overrides?: Partial<
    Pick<
      Category,
      | "name"
      | "icon"
      | "color"
      | "synonyms"
      | "description"
      | "explanation"
      | "position"
      | "status"
    >
  >
): Promise<Category> {
  const randomSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Positions are unique per methodology version, so default to appending last.
  // Counting DELETED rows too keeps the generated position free even when a test
  // has soft-deleted a sibling.
  //
  // Read and write are wrapped in a transaction that locks the parent
  // methodology version first, exactly like createCategory: without it two
  // factory calls for the same version — or one against the seeded methodology,
  // which already holds position 1 — both read the same max and the partial
  // unique index rejects the loser with an opaque P2002 about a field the test
  // never set. Mirrors createTestSubcategory.
  return await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "methodology_version" WHERE "id" = ${methodologyVersionId} FOR UPDATE`;

    const { _max } = await tx.category.aggregate({
      where: { methodologyVersionId },
      _max: { position: true },
    });

    return await tx.category.create({
      data: {
        methodologyVersionId,
        name: overrides?.name ?? `Test - Category ${randomSuffix}`,
        icon: overrides?.icon ?? "FACTORY",
        color: overrides?.color ?? "#000000",
        synonyms: overrides?.synonyms ?? "test",
        description: overrides?.description ?? "Test category description",
        explanation: overrides?.explanation ?? null,
        position: overrides?.position ?? (_max.position ?? 0) + 1,
        status: overrides?.status ?? CategoryStatus.ACTIVE,
        createdById: null,
        updatedById: null,
      },
    });
  });
}

/**
 * Drops the categories whose names start with one of `namePrefixes`.
 *
 * Tests that assert an order add categories to the seeded methodology, which is
 * the one the rest of the file reads. Cleaning up on the last line of the test
 * body only runs when the assertions pass, so a single failure leaves the extra
 * category — and its cascaded subcategories — visible to every test that
 * follows in the same file. Call this from an `afterEach` instead.
 *
 * The prefixes are the caller's own, never the factory's shared `Test - `: this
 * is a hard delete that cascades to subcategories and their inventory lines,
 * so it must only ever name rows the calling file authored — every other test
 * in the file reads the same seeded methodology.
 */
export async function cleanupTestCategories(
  prisma: PrismaClient,
  namePrefixes: string[]
): Promise<void> {
  await prisma.category.deleteMany({
    where: {
      OR: namePrefixes.map((namePrefix) => ({
        name: { startsWith: namePrefix },
      })),
    },
  });
}
