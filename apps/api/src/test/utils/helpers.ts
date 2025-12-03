import type { PrismaClient } from "@repo/database";

export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.book.deleteMany();
    await tx.user.deleteMany();
  });
}
