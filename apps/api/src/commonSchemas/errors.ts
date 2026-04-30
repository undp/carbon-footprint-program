import { z } from "zod";

/**
 * Unified error response schema for all API errors.
 * Used for 4xx and 5xx responses.
 */
export const ApiErrorResponseSchema = z.object({
  code: z.string().describe("Machine-readable error code"),
  message: z
    .string()
    .describe("Developer-facing message; not for end-user display"),
  details: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "Optional structured context for the frontend to render localized copy"
    ),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export const VALIDATION_ERROR_CODE = "FST_ERR_VALIDATION";
