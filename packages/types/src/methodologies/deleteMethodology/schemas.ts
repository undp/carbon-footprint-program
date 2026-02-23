import { z } from "zod";
import { IdSchema } from "../../zod.js";

// Params Schema
export const DeleteMethodologyParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the methodology to delete"),
  })
  .strict();

// Response Schema
export const DeleteMethodologyResponseSchema = z
  .object({
    message: z.string().describe("Confirmation message"),
    id: IdSchema.describe("The ID of the deleted methodology"),
  })
  .strict();
