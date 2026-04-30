import createError from "@fastify/error";

/**
 * Thrown when an organization main activity references a (sector, subsector) pair where
 * the subsector does not belong to the given sector. Feature-local because this rule
 * only applies to the main-activity ↔ catalog relationship.
 */
export const SectorSubsectorMismatchError = createError(
  "SECTOR_SUBSECTOR_MISMATCH",
  "The provided subsector does not belong to the provided sector",
  400
);
