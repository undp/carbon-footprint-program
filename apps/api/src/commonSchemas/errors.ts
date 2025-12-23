import { z } from "zod";

export const ValidationErrorResponseSchema = z
  .object({
    message: z.string().describe("Validation error message"),
    error: z.string().describe("Error type"),
    errors: z.array(z.any()).describe("Validation errors details").optional(),
  })
  .describe("Validation error response");

export const NotFoundErrorResponseSchema = z
  .object({
    message: z.string().describe("The error message"),
  })
  .describe("Not found error response");

// Typescript
export type ValidationErrorResponse = z.infer<
  typeof ValidationErrorResponseSchema
>;
export type NotFoundErrorResponse = z.infer<typeof NotFoundErrorResponseSchema>;
