import { GasDetailsSchema } from "@repo/types";
import { DataIntegrityError } from "@/errors/index.js";

/**
 * Safely parses the gasDetails JSONB column from the database.
 * Throws DataIntegrityError if the stored JSON does not match the expected schema.
 */
export function parseGasDetails(
  gasDetails: unknown,
  emissionFactorId: bigint | string
) {
  const result = GasDetailsSchema.safeParse(gasDetails);

  if (!result.success) {
    throw new DataIntegrityError(
      `Invalid gasDetails structure for emission factor ${emissionFactorId}: ${result.error.message}`
    );
  }

  return result.data;
}
