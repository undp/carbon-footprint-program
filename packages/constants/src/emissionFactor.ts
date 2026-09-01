/**
 * Bounds for an emission factor's reporting year.
 *
 * The year is part of a factor's identity, drives which vintage the capture
 * screen recommends, and decides whether a captured line is flagged as using a
 * stale factor. A typo therefore does not just look wrong: it sorts to the top
 * of the selector, wins the ranking, and marks every line that uses it as
 * mismatched, permanently.
 *
 * The range is deliberately wide — no methodology publishes a factor outside it,
 * and a deployment that inherits older national inventories should not have to
 * fight the schema. It is a sanity bound, not a policy.
 */
export const EMISSION_FACTOR_YEAR_MIN = 1900;

/**
 * Upper bound. Fixed rather than derived from the current date so that the same
 * payload is accepted or rejected regardless of when it is sent — a factor
 * published ahead of its reporting year is legitimate, and a validation that
 * changes answer overnight is not.
 */
export const EMISSION_FACTOR_YEAR_MAX = 2100;
