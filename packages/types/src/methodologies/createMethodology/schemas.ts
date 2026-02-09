import { z } from "zod";
import { MethodologySchema } from "../baseSchemas.js";

// Request Schema
export const CreateMethodologyRequestSchema = z
  .object({
    name: z.string().min(1).max(255).describe("The name of the methodology"),
    description: z.string().describe("The description of the methodology"),
    regulation: z
      .string()
      .min(1)
      .max(255)
      .describe("The regulation/standard reference"),
    version: z.string().min(1).max(100).describe("The version identifier"),
  })
  .strict();

// Response Schema
export const CreateMethodologyResponseSchema = MethodologySchema;
