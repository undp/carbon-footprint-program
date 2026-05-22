import type { SeedsDataset } from "@/prisma/seeds/utils/SeedsDataset.type.js";

export const NODE_ENV = process.env.NODE_ENV;

export const DATABASE_URL = process.env.DATABASE_URL ?? "";

export const SEEDS_DATASET: SeedsDataset = (() => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const env = (process.env.SEEDS_DATASET ?? "base").toLowerCase();
  if (env !== "base" && env !== "testing") {
    throw new Error(`Invalid seeds dataset: ${env}`);
  }
  return env;
})();
