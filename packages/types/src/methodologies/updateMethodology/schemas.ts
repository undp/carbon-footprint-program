import { z } from "zod";
import {
  MethodologySchema,
  MethodologyVersionStatusSchema,
} from "../baseSchemas.js";
import { IdSchema } from "../../zod.js";

// Params Schema
export const UpdateMethodologyParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the methodology to update"),
  })
  .strict();

// Request Schema - all fields optional for partial updates
export const UpdateMethodologyRequestSchema = z
  .object({
    name: z.string().min(1).max(255).describe("The name of the methodology"),
    description: z
      .string()
      .nullable()
      .describe("The description of the methodology"),
    regulation: z
      .string()
      .min(1)
      .max(255)
      .describe("The regulation/standard reference"),
    version: z.string().min(1).max(100).describe("The version identifier"),
    status: MethodologyVersionStatusSchema,
  })
  .partial()
  .strict();

// Response Schema
export const UpdateMethodologyResponseSchema = MethodologySchema;
