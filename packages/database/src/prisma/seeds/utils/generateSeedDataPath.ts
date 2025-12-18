import { join, basename } from "path";
import { type SeedsDataset } from "./SeedsDataset.type.js";

export const generateSeedDataPath = (
  dirname: string,
  fileName: string,
  environment: SeedsDataset
): string => {
  if (fileName !== basename(fileName))
    throw new Error(
      `Invalid seed fileName: '${fileName}' for dataset ${environment}`
    );

  return join(dirname, `../data/${environment}/${fileName}`);
};
