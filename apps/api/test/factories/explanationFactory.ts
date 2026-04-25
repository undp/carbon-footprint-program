import type { Explanation, PrismaClient } from "@repo/database";

export async function createTestExplanation(
  prisma: PrismaClient,
  overrides?: Partial<
    Pick<Explanation, "slug" | "name" | "description" | "content">
  >
): Promise<Explanation> {
  const randomSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return prisma.explanation.create({
    data: {
      slug: overrides?.slug ?? `test_explanation_${randomSuffix}`,
      name: overrides?.name ?? `Test Explanation ${randomSuffix}`,
      description: overrides?.description ?? null,
      content: overrides?.content ?? "",
    },
  });
}

export async function cleanupTestExplanations(
  prisma: PrismaClient
): Promise<void> {
  await prisma.explanation.deleteMany({});
}
