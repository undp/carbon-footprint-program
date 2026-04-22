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
