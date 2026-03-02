import { z } from "zod";
import {
  CountryBaseSchema,
  MethodologyVersionBaseSchema,
} from "../../baseSchemas/index.js";
import { IdSchema } from "../../zod.js";

const MethodologyWithCountsItemSchema = MethodologyVersionBaseSchema.extend({
  country: z
    .object({
      id: IdSchema,
      name: CountryBaseSchema.shape.name,
      isoCode: CountryBaseSchema.shape.isoCode,
    })
    .optional()
    .describe("The country this methodology belongs to"),
  categoryCount: z
    .number()
    .int()
    .optional()
    .describe("Number of categories in this methodology"),
  carbonInventoryCount: z
    .number()
    .int()
    .optional()
    .describe(
      "Number of carbon inventories in DRAFT, SUBMITTED, or VERIFIED status using this methodology"
    ),
});

// Response Schema
export const GetAllMethodologiesResponseSchema = z.array(
  MethodologyWithCountsItemSchema
);
