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
 * Drops every category this factory's default naming leaves behind.
 *
 * Tests that assert an order have to author positions on the seeded
 * methodology, which is the one the rest of the file reads. Cleaning up on the
 * last line of the test body only runs when the assertions pass, so a single
 * failure leaves the extra category — and its cascaded subcategories — visible
 * to every test that follows in the same file. Call this from an `afterEach`
 * instead.
 *
 * Cascades to subcategories and their inventory lines, like a single delete.
 */
export async function cleanupTestCategories(
  prisma: PrismaClient
): Promise<void> {
  await prisma.category.deleteMany({
    where: { name: { startsWith: "Test - " } },
  });
}
