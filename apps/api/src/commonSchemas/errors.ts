import { z } from "zod";

/**
 * Unified error response schema for all API errors.
 * Used for 4xx and 5xx responses.
 *
 * `userMessage` is an optional, end-user-friendly Spanish message. Services can attach it
 * by setting `error.userMessage` on the thrown error; the Fastify error handler propagates
 * it into the response body. The frontend's `getApiErrorMessage` prefers `userMessage`
 * over the generic per-code fallback when present.
 */
export const ApiErrorResponseSchema = z.object({
  code: z.string().describe("Machine-readable error code"),
  message: z.string().describe("Human-readable error message"),
  userMessage: z
    .string()
    .optional()
    .describe(
      "Optional Spanish, end-user-friendly explanation of the failure (forwarded by the error handler when set on the thrown error)"
    ),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export const VALIDATION_ERROR_CODE = "FST_ERR_VALIDATION";
