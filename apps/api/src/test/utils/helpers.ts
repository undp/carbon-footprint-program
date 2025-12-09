import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

const getDmmfModels = () => {
  if (!Prisma.dmmf?.datamodel?.models) {
    throw new Error(
      "Unable to access Prisma DMMF. Ensure the client is correctly generated."
    );
  }
  return Prisma.dmmf.datamodel.models;
};

const cleanDatabaseWithDelete = async (
  prisma: PrismaClient,
  exclude: string[]
): Promise<void> => {
  const models = getDmmfModels();
  const normalizedExclude = exclude.map((name) => name.toLowerCase());

  await prisma.$transaction(
    async (tx) => {
      for (const model of models) {
        const tableName = (model.dbName ?? model.name).toLowerCase();
        if (normalizedExclude.includes(tableName)) continue;

        const delegateName =
          model.name.charAt(0).toLowerCase() + model.name.slice(1);

        const prismaModel = (
          tx as Record<string, { deleteMany?: () => Promise<unknown> }>
        )[delegateName];

        if (prismaModel?.deleteMany) {
          await prismaModel.deleteMany();
        }
      }
    },
    { timeout: 30000 }
  );
};

export const cleanDatabase = async (
  prisma: PrismaClient,
  options: {
    exclude?: string[];
    restartIdentity?: boolean;
  } = {}
): Promise<void> => {
  const { exclude = [], restartIdentity = true } = options;

  const normalizedExclude = exclude.map((name) => name.toLowerCase());

  const models = getDmmfModels();
  const tableNames = models
    .map((m) => m.dbName ?? m.name)
    .map((name) => name.toLowerCase())
    .filter((name) => !normalizedExclude.includes(name));

  if (tableNames.length === 0) return;

  const quotedTables = tableNames.map((name) => `"${name}"`).join(", ");
  const restartClause = restartIdentity ? " RESTART IDENTITY" : "";
  const sql = `TRUNCATE TABLE ${quotedTables}${restartClause} CASCADE;`;

  try {
    await prisma.$executeRawUnsafe(sql);
  } catch {
    await cleanDatabaseWithDelete(prisma, normalizedExclude);
  }
};
