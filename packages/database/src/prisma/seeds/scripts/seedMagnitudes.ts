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

const SYSTEM_MAGNITUDE_CODES = new Set(["mass"]);

const MagnitudeDataSchema = z.array(
  z.object({
    code: z.string().min(1),
    name: z.string().min(1),
  })
);

export async function seedMagnitudes(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding magnitudes...");

  const magnitudesData = MagnitudeDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(__dirname, "magnitudes.json", dataset),
        "utf-8"
      )
    )
  );

  checkForDuplicates(magnitudesData, ["code"]);

  for (const { code, name } of magnitudesData) {
    await prisma.magnitude.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name,
        isSystem: SYSTEM_MAGNITUDE_CODES.has(code),
        status: "ACTIVE",
      },
    });
  }

  const systemCount = magnitudesData.filter((m) =>
    SYSTEM_MAGNITUDE_CODES.has(m.code)
  ).length;
  console.log(
    `✓ Ensured ${magnitudesData.length} magnitudes exist (${systemCount} system, ${magnitudesData.length - systemCount} non-system): ${magnitudesData.map((m) => m.code).join(", ")} for dataset ${dataset}`
  );
}
