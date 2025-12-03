import type { PrismaClient } from "@repo/database";
import { Prisma } from "@repo/database";

function getDmmfModels() {
  if (!Prisma.dmmf?.datamodel?.models) {
    throw new Error(
      "Unable to access Prisma DMMF. Ensure the client is correctly generated."
    );
  }
  return Prisma.dmmf.datamodel.models;
}

async function cleanDatabaseWithDelete(
  prisma: PrismaClient,
  exclude: string[]
): Promise<void> {
  const models = getDmmfModels();
  await prisma.$transaction(
    async (tx) => {
      for (const model of models) {
        if (exclude.includes(model.name.toLowerCase())) continue;
        const prismaModel = (
          tx as Record<string, { deleteMany?: () => Promise<unknown> }>
        )[model.name];
        if (prismaModel?.deleteMany) {
          await prismaModel.deleteMany();
        }
      }
    },
    { timeout: 30000 }
  );
}

export async function cleanDatabase(
  prisma: PrismaClient,
  options: {
    exclude?: string[];
    restartIdentity?: boolean;
  } = {}
): Promise<void> {
  const { exclude = [], restartIdentity = true } = options;

  const models = getDmmfModels();
  const tableNames = models
    .map((m) => m.dbName ?? m.name.toLowerCase())
    .filter((name) => !exclude.includes(name.toLowerCase()));

  if (tableNames.length === 0) return;

  const quotedTables = tableNames.map((name) => `"${name}"`).join(", "); // quote table names
  const restartClause = restartIdentity ? " RESTART IDENTITY" : ""; // restart id sequence
  const sql = `TRUNCATE TABLE ${quotedTables}${restartClause} CASCADE;`; // faster than deleteMany

  try {
    await prisma.$executeRawUnsafe(sql);
  } catch {
    await cleanDatabaseWithDelete(prisma, exclude);
  }
}
