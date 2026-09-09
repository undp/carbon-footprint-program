import { type PrismaClient, Prisma } from "@repo/database";
import { SubcategoryStatus } from "@repo/types";

/**
 * Next position inside a category: a subcategory is always appended last.
 *
 * Positions are not supplied by the client. DELETED rows are excluded from both
 * the max and the partial unique index, so the position of a soft-deleted
 * subcategory becomes free again — but only the highest one is ever handed out
 * again: deleting a subcategory in the middle leaves a permanent gap, and gaps
 * accumulate over delete/create cycles. Order is what matters here, not
 * contiguity.
 *
 * The parent category row is locked first. Without it two concurrent creates in
 * the same category both read the same max under READ COMMITTED, both attempt
 * the same position, and the partial unique index rejects the loser with a 409
 * about a field the client never filled in. The lock is held until the
 * transaction ends, so the second caller reads the max only after the first has
 * inserted. Callers must therefore run inside a transaction.
 */
export async function getNextSubcategoryPosition(
  prismaClient: PrismaClient | Prisma.TransactionClient,
  categoryId: bigint
): Promise<number> {
  await prismaClient.$queryRaw`SELECT "id" FROM "category" WHERE "id" = ${categoryId} FOR UPDATE`;

  const { _max } = await prismaClient.subcategory.aggregate({
    where: {
      categoryId,
      status: { not: SubcategoryStatus.DELETED },
    },
    _max: { position: true },
  });

  return (_max.position ?? 0) + 1;
}
