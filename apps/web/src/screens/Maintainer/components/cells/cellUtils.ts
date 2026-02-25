import { type FieldError } from "react-hook-form";

/** Traverse a nested object by path segments, returning the value at that path. */
export function getNestedError(
  obj: Record<string, unknown>,
  ...keys: (string | number)[]
): FieldError | undefined {
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current as FieldError | undefined;
}
