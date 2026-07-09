import { type PrismaClient } from "@repo/database";
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
  min: z.number().int().optional(),
  max: z.number().int().optional(),
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

      // min/max are only meaningful for numeric parameters. When set, verify
      // the consistency of the bounds and that the seeded value falls inside.
      const hasMin = item.min !== undefined;
      const hasMax = item.max !== undefined;
      if (hasMin || hasMax) {
        if (item.type !== "number") {
          ctx.addIssue({
            code: "custom",
            message: `Parameter "${item.key}" declares min/max bounds but its type is "${item.type}" (expected "number")`,
            path: [i, "type"],
          });
        }
        if (hasMin && hasMax && item.min! > item.max!) {
          ctx.addIssue({
            code: "custom",
            message: `Parameter "${item.key}" has min (${item.min}) greater than max (${item.max})`,
            path: [i, "min"],
          });
        }
        if (item.type === "number") {
          if (!/^-?\d+$/.test(item.value)) {
            ctx.addIssue({
              code: "custom",
              message: `Parameter "${item.key}" declares min/max bounds but value "${item.value}" is not a valid integer`,
              path: [i, "value"],
            });
          } else {
            const numericValue = Number(item.value);
            if (hasMin && numericValue < item.min!) {
              ctx.addIssue({
                code: "custom",
                message: `Parameter "${item.key}" value (${numericValue}) is less than min (${item.min})`,
                path: [i, "value"],
              });
            }
            if (hasMax && numericValue > item.max!) {
              ctx.addIssue({
                code: "custom",
                message: `Parameter "${item.key}" value (${numericValue}) is greater than max (${item.max})`,
                path: [i, "value"],
              });
            }
          }
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
      minValue: param.min ?? null,
      maxValue: param.max ?? null,
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
