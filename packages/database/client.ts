import { PrismaClient } from "./generated/client/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { DATABASE_URL, NODE_ENV } from "./constants.js";

const adapter = new PrismaPg({
  connectionString: DATABASE_URL,
});

// Use globalThis for broader environment compatibility
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

// Named export with global memoization
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
