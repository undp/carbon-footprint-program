import { z } from "zod";

/**
 * Shared validation for the `originalName` field used by every legal upload
 * endpoint. Centralized here so request and confirm schemas cannot drift
 * apart and silently accept different filename rules at the two ends of the
 * upload flow.
 */
export const LegalOriginalNameSchema = z
  .string()
  .min(1)
  .max(255)
  .trim()
  .regex(/^[ -~]+$/, "File name must only contain printable ASCII characters")
  .refine(
    (name) => !/[/\\:]/.test(name),
    "File name must not contain path separators or colons"
  );
