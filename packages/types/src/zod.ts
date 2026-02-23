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
