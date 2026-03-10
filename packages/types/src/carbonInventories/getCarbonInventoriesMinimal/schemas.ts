import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { CarbonInventoryDisplayStatusSchema } from "../schemas.js";

export const GetCarbonInventoriesMinimalParamsSchema = z.object({
  statuses: z
    .union([
      z.string(), // ?statuses=ACTIVE,BLOCKED
      z.array(z.string()), // ?statuses=ACTIVE&statuses=BLOCKED
    ])
    .transform((value) => {
      if (typeof value === "string") {
        return value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      }
      return value;
    })
    .pipe(z.array(CarbonInventoryDisplayStatusSchema))
    .optional(),
});

export type GetCarbonInventoriesMinimalParams = z.infer<
  typeof GetCarbonInventoriesMinimalParamsSchema
>;

export const GetCarbonInventoriesMinimalItemSchema = z.object({
  id: IdSchema,
  name: z.string().nullable(),
  year: z.number().int().nullable(),
  status: CarbonInventoryDisplayStatusSchema,
});

export const GetCarbonInventoriesMinimalResponseSchema = z.array(
  GetCarbonInventoriesMinimalItemSchema
);
