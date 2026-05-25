import { ApplicationConfigError } from "@/errors/index.js";

export interface SystemParameterIntRow {
  value: string;
  minValue: number | null;
  maxValue: number | null;
}

/**
 * Validates the `value` of a system parameter row as an integer within the
 * configured `min_value` / `max_value` bounds. Throws `ApplicationConfigError`
 * when the row is missing, non-integer, or out of range. Shared by
 * `getSystemParameterIntValue` (single key) and `getFileUploadLimits`
 * (batched read) so the integer semantics stay consistent.
 */
export function parseSystemParameterInt(
  key: string,
  row: SystemParameterIntRow | null
): number {
  if (row === null) {
    throw new ApplicationConfigError(`${key} is not set`);
  }

  if (!/^[+-]?\d+$/.test(row.value)) {
    throw new ApplicationConfigError(
      `${key} has non-integer value "${row.value}"`
    );
  }
  const parsed = Number.parseInt(row.value, 10);
  if (Number.isNaN(parsed)) {
    throw new ApplicationConfigError(
      `${key} has non-integer value "${row.value}"`
    );
  }

  if (row.minValue !== null && parsed < row.minValue) {
    throw new ApplicationConfigError(
      `${key} value (${parsed}) is below configured minimum (${row.minValue})`
    );
  }

  if (row.maxValue !== null && parsed > row.maxValue) {
    throw new ApplicationConfigError(
      `${key} value (${parsed}) is above configured maximum (${row.maxValue})`
    );
  }

  return parsed;
}
