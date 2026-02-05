import { z } from "zod";

/**
 * Unified error response schema for all API errors.
 * Used for 4xx and 5xx responses.
 */
export const ApiErrorResponseSchema = z.object({
  code: z.string().describe("Machine-readable error code"),
  message: z.string().describe("Human-readable error message"),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

// Legacy aliases for backward compatibility
// TODO: Migrate all usages to ApiErrorResponseSchema and remove these

export const VALIDATION_ERROR_CODE = "FST_ERR_VALIDATION";
