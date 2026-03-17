import { type PrismaClient, type Prisma } from "../../../index.js";
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

type SystemParameterData = Pick<
  Prisma.SystemParameterCreateInput,
  "key" | "value" | "description" | "type"
>[];

const SystemParameterDataSchema: z.ZodType<SystemParameterData> = z.array(
  z.object({
    key: z.string().min(1),
    value: z.string().min(1),
    description: z.string().min(1),
    type: z.string().min(1),
  })
);

export async function seedSystemParameters(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding system parameters...");

  const systemParametersData = SystemParameterDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(__dirname, "systemParameters.json", dataset),
        "utf-8"
      )
    )
  );

  checkForDuplicates(systemParametersData, ["key"]);

  await prisma.systemParameter.createMany({
    data: systemParametersData.map((param) => ({
      key: param.key,
      value: param.value,
      description: param.description,
      type: param.type,
    })),
    skipDuplicates: true,
  });

  const systemParameters = await prisma.systemParameter.findMany({
    select: { key: true },
  });

  const existingKeys = new Set(systemParameters.map((p) => p.key));
  const missingKeys = systemParametersData
    .map((p) => p.key)
    .filter((key) => !existingKeys.has(key));

  if (missingKeys.length > 0)
    throw new Error(
      `Missing system parameter keys for dataset ${dataset}: ${missingKeys.join(", ")}`
    );

  console.log(
    `✓ Ensured ${systemParametersData.length} system parameters exist for dataset ${dataset}`
  );
}
