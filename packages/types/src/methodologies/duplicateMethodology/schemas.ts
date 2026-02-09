import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { MethodologySchema } from "../baseSchemas.js";

// Request Schema - receives the ID as a path parameter
export const DuplicateMethodologyParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the methodology to duplicate"),
  })
  .strict();

// Response Schema
export const DuplicateMethodologyResponseSchema = MethodologySchema;
