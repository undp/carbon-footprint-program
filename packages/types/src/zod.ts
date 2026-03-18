import { z } from "zod";

/**
 * A reusable schema for ID fields that must be numeric strings.
 * Use this for consistent ID validation across the codebase.
 *
 * @example
 * const UserSchema = z.object({
 *   id: IdSchema.describe("The user ID"),
 *   name: z.string(),
 * });
 */
export const IdSchema = z
  .string()
  .regex(/^\d+$/)
  .describe("An ID as a numeric string");

/**
 * Creates a schema that accepts comma-separated strings or arrays
 * and normalizes them to a trimmed, non-empty string array.
 * Does not perform per-item validation beyond trimming and filtering empties.
 *
 * @example
 *
 * // Without validation (plain string array):
 * listQueryParam() // "a,b,c" → ["a", "b", "c"]
 */
export const listQueryParam = () =>
  z.union([z.string(), z.array(z.string())]).transform((value) => {
    if (typeof value === "string") {
      return value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return value.map((v) => v.trim()).filter(Boolean);
  });
