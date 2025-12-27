import { type PrismaClient } from "../../../index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  checkForDuplicates,
  generateSeedDataPath,
  type SeedsDataset,
} from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const StatusCatalogDataSchema = z.array(
  z.object({
    scope: z.string().min(1),
    code: z.string().min(1),
    name: z.string().min(1),
    is_terminal: z.boolean().nullable(),
    is_visible: z.boolean().nullable(),
    sort_order: z.number().nullable(),
    is_active: z.boolean().nullable(),
  })
);

export async function seedStatusCatalog(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding status catalog...");

  // Read status catalog
  const statusCatalogData = StatusCatalogDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(__dirname, "status_catalog.json", dataset),
        "utf-8"
      )
    )
  );

  // Check the data has no duplicates based on code
  checkForDuplicates(statusCatalogData, ["scope", "code"]);

  // Batch create status catalog entries (skips duplicates)
  await prisma.status_catalog.createMany({
    data: statusCatalogData.map((sc) => ({
      scope: sc.scope,
      code: sc.code,
      name: sc.name,
      is_terminal: sc.is_terminal,
      is_visible: sc.is_visible,
      sort_order: sc.sort_order,
      is_active: sc.is_active,
    })),
    skipDuplicates: true,
  });

  // Verify all status catalog entries were created
  const statusCatalogEntries = await prisma.status_catalog.findMany();

  if (statusCatalogEntries.length !== statusCatalogData.length)
    throw new Error(
      `Expected ${statusCatalogData.length} status catalog entries but found ${statusCatalogEntries.length} for dataset ${dataset}`
    );

  console.log(
    `✓ Ensured ${statusCatalogData.length} status catalog entries exist for dataset ${dataset}`
  );
}
