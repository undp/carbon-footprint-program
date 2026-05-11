import type { GetAllMeasurementUnitsResponse } from "@repo/types";

const spanishCollator = new Intl.Collator("es");

// Sort in JS so the order is identical across deployments regardless of the
// database's default text collation (binary on Alpine, locale-aware on glibc).
export const compareMeasurementUnitsForDisplay = (
  a: GetAllMeasurementUnitsResponse[number],
  b: GetAllMeasurementUnitsResponse[number]
): number => {
  const byMagnitude = spanishCollator.compare(
    a.magnitude.name,
    b.magnitude.name
  );
  if (byMagnitude !== 0) return byMagnitude;
  return spanishCollator.compare(a.name, b.name);
};
