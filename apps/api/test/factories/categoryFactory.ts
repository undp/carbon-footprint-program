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

  return await prisma.category.create({
    data: {
      methodologyVersionId,
      name: overrides?.name ?? `Test - Category ${randomSuffix}`,
      icon: overrides?.icon ?? "FACTORY",
      color: overrides?.color ?? "#000000",
      synonyms: overrides?.synonyms ?? "test",
      description: overrides?.description ?? "Test category description",
      explanation: overrides?.explanation ?? null,
      position: overrides?.position ?? 1,
      status: overrides?.status ?? CategoryStatus.ACTIVE,
      createdById: null,
      updatedById: null,
    },
  });
}

/**
 * Drops the categories whose names start with one of `namePrefixes`.
 *
 * Tests that assert an order have to author positions on the seeded
 * methodology, which is the one the rest of the file reads. Cleaning up on the
 * last line of the test body only runs when the assertions pass, so a single
 * failure leaves the extra category — and its cascaded subcategories — visible
 * to every test that follows in the same file. Call this from an `afterEach`
 * instead.
 *
 * The prefixes are the caller's own, never the factory's shared `Test - `: the
 * suite runs with `fileParallelism` and one shared database (see
 * `apps/api/vitest.config.ts` and `test/setup/globalSetup.ts`), so deleting by
 * the shared prefix would drop categories another test file created seconds
 * ago — and this is a hard delete that cascades to subcategories and their
 * inventory lines, like a single delete does.
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
