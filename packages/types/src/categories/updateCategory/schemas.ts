import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { CategoryBaseSchema } from "../../baseSchemas/index.js";

// Params Schema
export const UpdateCategoryParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the category to update"),
  })
  .strict();

// Request Schema — all fields optional for partial updates, but at least one must be provided
//
// No `position`: it is assigned on create and changed only through
// POST /api/categories/swap-positions, which swaps two adjacent siblings under
// the methodology version lock. Accepting one here let a client write an
// arbitrary number with no lock and no repack, breaking the contiguous 1..N
// sequence the grid, the Excel export, the docs and the seed all assume.
export const UpdateCategoryRequestSchema = CategoryBaseSchema.pick({
  name: true,
  icon: true,
  color: true,
  synonyms: true,
  description: true,
  explanation: true,
})
  .partial()
  .strict()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "At least one field must be provided with a defined value",
  });

// Response Schema
export const UpdateCategoryResponseSchema = CategoryBaseSchema;
