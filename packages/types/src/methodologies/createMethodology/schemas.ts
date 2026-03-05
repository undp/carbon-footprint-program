import { MethodologyVersionBaseSchema } from "../../baseSchemas/index.js";

// Request Schema
export const CreateMethodologyRequestSchema = MethodologyVersionBaseSchema.pick(
  {
    name: true,
    description: true,
    regulation: true,
    version: true,
  }
).strict();

// Response Schema
export const CreateMethodologyResponseSchema = MethodologyVersionBaseSchema;
