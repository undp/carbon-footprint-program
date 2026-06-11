import { type PrismaClient } from "@repo/database";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { generateSeedDataPath, type SeedsDataset } from "@/utils/index.js";
import { FullMethodologyDataSchema } from "../shared.js";
import { seedCategories } from "./seedCategories.js";
import { seedEmissionFactorDimensions } from "./seedEmissionFactorDimensions.js";
import { seedEmissionFactors } from "./seedEmissionFactors.js";
import { seedMethodologies } from "./seedMethodologies.js";
import { seedSubcategories } from "./seedSubcategories.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function seedMethodologyData(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding methodology data...");

  // Read nested methodologies data
  const nestedData = FullMethodologyDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(dirname(__dirname), "methodologies.json", dataset),
        "utf-8"
      )
    )
  );

  await seedMethodologies(prisma, nestedData, dataset);
  await seedCategories(prisma, nestedData, dataset);
  await seedSubcategories(prisma, nestedData, dataset);
  await seedEmissionFactorDimensions(prisma, nestedData, dataset);
  await seedEmissionFactors(prisma, nestedData, dataset);

  console.log(
    `✓ Ensured all the methodology data exist for dataset ${dataset}`
  );
}
