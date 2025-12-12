import { join } from "path";
import { type SeedEnvironment } from "./SeedEnvironment.type.js";

export const generateSeedDataPath = (
  dirname: string,
  fileName: string,
  environment: SeedEnvironment
): string => join(dirname, `../data/${environment}/${fileName}`);
