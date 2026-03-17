import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const SelfDeclareParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const SelfDeclareResponseSchema = z
  .null()
  .describe("Self-declaration completed successfully");
