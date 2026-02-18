import { z } from "zod";
import { IdSchema } from "../../zod.js";

// Params Schema
export const DeleteCategoryParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the category to delete"),
  })
  .strict();

// Response Schema
export const DeleteCategoryResponseSchema = z
  .object({
    message: z.string().describe("Confirmation message"),
    id: IdSchema.describe("The ID of the deleted category"),
  })
  .strict();
