import { z } from "zod";

// TODO: improve the app error handling. For example, all these schemas are the same.

export const VALIDATION_ERROR_CODE = "FST_ERR_VALIDATION";

export const ValidationErrorResponseSchema = z
  .object({
    code: z.string().describe("Error code"),
    message: z.string().describe("Validation error message"),
  })
  .describe("Validation error response");

export const NotFoundErrorResponseSchema = z
  .object({
    code: z.string().describe("Error code"),
    message: z.string().describe("The error message"),
  })
  .describe("Not found error response");

export const StructuredErrorResponseSchema = z
  .object({
    code: z.string().describe("Error code"),
    message: z.string().describe("Error message"),
  })
  .describe("Structured error response");

export const ErrorResponseSchema = z
  .object({
    message: z.string().describe("The error message"),
  })
  .describe("Error response");

// Typescript
export type ValidationErrorResponse = z.infer<
  typeof ValidationErrorResponseSchema
>;
export type NotFoundErrorResponse = z.infer<typeof NotFoundErrorResponseSchema>;
export type StructuredErrorResponse = z.infer<
  typeof StructuredErrorResponseSchema
>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
