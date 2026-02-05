import { z } from "zod";
import { IdSchema } from "../zod.js";
import { MethodologySchema } from "./base.js";

// Request Schema - receives the ID as a path parameter
export const DuplicateMethodologyParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the methodology to duplicate"),
  })
  .strict();

// Response Schema
export const DuplicateMethodologyResponseSchema = MethodologySchema;

// TypeScript Types
export type DuplicateMethodologyParams = z.infer<typeof DuplicateMethodologyParamsSchema>;
export type DuplicateMethodologyResponse = z.infer<typeof DuplicateMethodologyResponseSchema>;
