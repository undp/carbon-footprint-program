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
 * Creates a schema that accepts comma-separated strings or arrays,
 * normalizes to an array, and optionally validates each element.
 *
 * @param itemSchema - Optional Zod schema to validate each array element
 *
 * @example
 * // With validation:
 * listQueryParam(OrganizationStatusSchema) // "ACTIVE,BLOCKED" → ["ACTIVE", "BLOCKED"]
 *
 * // Without validation (plain string array):
 * listQueryParam() // "a,b,c" → ["a", "b", "c"]
 */
export const listQueryParam = <T extends string = string>(
  itemSchema?: z.ZodType<T, T>
) => {
  return z.union([z.string(), z.array(z.string())]).transform((value): T[] => {
    const items =
      typeof value === "string"
        ? value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        : value;

    if (itemSchema) {
      return items.map((item) => itemSchema.parse(item));
    }
    return items as T[];
  });
};
