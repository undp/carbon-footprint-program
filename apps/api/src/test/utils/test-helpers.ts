import type { PrismaClient } from "@repo/database";

// --------------------------------------------------------------------------------
// OBJECTIVE: Provide generic test helpers that can be reused across features.
// EXPLANATION:
// These helpers are generic utilities that don't belong to any specific feature.
// Feature-specific helpers should be co-located with their features.
// --------------------------------------------------------------------------------

/**
 * Cleans all data from the database.
 * Useful for resetting the database state between tests.
 *
 * @param prisma - Prisma client instance
 */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  // Delete in order to respect foreign key constraints
  await prisma.bookHistory.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Cleans only book-related data from the database.
 * Useful when you only need to clean book data without affecting users.
 *
 * @param prisma - Prisma client instance
 */
export async function cleanBookData(prisma: PrismaClient): Promise<void> {
  await prisma.bookHistory.deleteMany();
  await prisma.book.deleteMany();
}
