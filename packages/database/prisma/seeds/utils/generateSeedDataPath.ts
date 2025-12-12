import { join } from "path";

export const generateSeedDataPath = (
  dirname: string,
  fileName: string,
  environment: "base" | "testing"
): string => join(dirname, `../data/${environment}/${fileName}`);
