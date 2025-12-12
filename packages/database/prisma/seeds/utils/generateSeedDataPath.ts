import { join, basename } from "path";
import { type SeedEnvironment } from "./SeedEnvironment.type.js";

export const generateSeedDataPath = (
  dirname: string,
  fileName: string,
  environment: SeedEnvironment
): string => {
  if (fileName !== basename(fileName))
    throw new Error(`Invalid seed fileName: '${fileName}'`);

  return join(dirname, `../data/${environment}/${fileName}`);
};
