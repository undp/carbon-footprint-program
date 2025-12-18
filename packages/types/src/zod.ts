import { z } from "zod";

/**
 * Returns a new Zod object schema with all fields of the input schema made nullable.
 *
 * This is useful when you want to accept `null` as a valid value for every property in an object schema.
 *
 * @template T - The shape of the Zod object schema.
 * @param schema - The Zod object schema to transform.
 * @returns A new Zod object schema where every field is nullable.
 *
 * @example
 * const UserSchema = z.object({ name: z.string(), age: z.number() });
 * const NullableUserSchema = makeAllFieldsNullable(UserSchema);
 * // NullableUserSchema parses:
 * // { name: null, age: null }, { name: "Alice", age: null }, etc.
 */
export const makeAllFieldsNullable = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
) => {
  const shape = schema.shape;
  const nullableShape = Object.keys(shape).reduce(
    (acc, key) => {
      const field = shape[key as keyof T] as unknown as z.ZodTypeAny;
      acc[key as keyof T] = field.nullable();
      return acc;
    },
    {} as Record<keyof T, z.ZodNullable<z.ZodTypeAny>>
  );
  return z.object(nullableShape);
};
