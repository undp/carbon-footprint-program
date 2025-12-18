import { z } from "zod";

// Helper function to make all fields in an object schema nullable
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
