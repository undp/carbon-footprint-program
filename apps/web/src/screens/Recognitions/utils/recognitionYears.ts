import { GetOrganizationRecognitionsResponse } from "@repo/types";

/**
 * Distinct measurement years of the earned recognitions, newest first.
 *
 * The year selector is built from the recognitions themselves, not from the
 * footprints' display status: a self-declared footprint keeps the
 * SELF_DECLARED status even though its measurement recognition was approved
 * automatically, and reduction-project recognitions have no footprint status.
 */
export const getRecognitionYears = (
  recognitions: GetOrganizationRecognitionsResponse
): number[] =>
  Array.from(new Set(recognitions.map((r) => r.measurementYear))).sort(
    (a, b) => b - a
  );
