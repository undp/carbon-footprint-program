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

/**
 * System parameter seed validation schema.
 * Keys and options here must always follow the corresponding types in @repo/types:
 * - SystemParameterKeySchema (for parameter keys)
 * - MeasurementRecognitionBehaviorSchema (for recognition behavior options)
 */
const SystemParameterSeedSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  description: z.string().min(1),
  type: z.string().min(1),
  options: z.array(z.string()).optional(),
});

const SystemParameterSeedDataSchema = z
  .array(SystemParameterSeedSchema)
  // Validate selector-type parameters: they must define a non-empty options array,
  // and their value must be one of the defined options.
  // Other parameter types can have an empty or omitted options array.
  .superRefine((arr, ctx) => {
    for (const [i, item] of arr.entries()) {
      // Empty `value` is only legitimate for file-type parameters that act
      // as pointers to an uploaded File row (e.g., TERMS_CONDITIONS_FILE_UUID
      // before the bootstrap seed runs). For every other parameter an empty
      // value is a configuration mistake and should fail the seed instead of
      // silently writing "" into the database.
      const allowsEmptyValue = item.type === "file";
      if (!allowsEmptyValue && item.value.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          message: `System parameter "${item.key}" must have a non-empty value`,
          path: [i, "value"],
        });
      }

      if (item.type === "selector") {
        if (!item.options || item.options.length === 0) {
          ctx.addIssue({
            code: "custom",
            message: `Selector parameter "${item.key}" must have at least one option`,
            path: [i, "options"],
          });
        } else if (!item.options.includes(item.value)) {
          ctx.addIssue({
            code: "custom",
            message: `Selector parameter "${item.key}" has value "${item.value}" which is not in options [${item.options.join(", ")}]`,
            path: [i, "value"],
          });
        }
      }
    }
  });

export async function seedSystemParameters(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding system parameters...");

  const systemParametersData = SystemParameterSeedDataSchema.parse(
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
      options: param.options ?? [],
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
