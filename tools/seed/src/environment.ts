import type { SeedsDataset } from "./utils/SeedsDataset.type.js";

export const SEEDS_DATASET: SeedsDataset = (() => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const env = (process.env.SEEDS_DATASET ?? "base").toLowerCase();
  if (env !== "base" && env !== "testing") {
    throw new Error(`Invalid seeds dataset: ${env}`);
  }
  return env;
})();
