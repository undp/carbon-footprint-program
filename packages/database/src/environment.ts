import type { SeedsDataset } from "@/prisma/seeds/utils/SeedsDataset.type.js";

export const NODE_ENV = process.env.NODE_ENV;

export const DATABASE_URL = process.env.DATABASE_URL ?? "";

export const DbProvider = {
  POSTGRESQL: "postgresql",
  SQLSERVER: "sqlserver",
} as const;

export type DbProvider = (typeof DbProvider)[keyof typeof DbProvider];

const VALID_DB_PROVIDERS = Object.values(DbProvider);

export const DB_PROVIDER: DbProvider = (() => {
  const value = (
    process.env.DB_PROVIDER ?? DbProvider.POSTGRESQL
  ).toLowerCase();
  if (!VALID_DB_PROVIDERS.includes(value as DbProvider)) {
    throw new Error(
      `Invalid DB_PROVIDER "${value}". Must be one of: ${VALID_DB_PROVIDERS.join(", ")}.`
    );
  }
  return value as DbProvider;
})();

export const SEEDS_DATASET: SeedsDataset = (() => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const env = (process.env.SEEDS_DATASET ?? "base").toLowerCase();
  if (env !== "base" && env !== "testing") {
    throw new Error(`Invalid seeds dataset: ${env}`);
  }
  return env;
})();
