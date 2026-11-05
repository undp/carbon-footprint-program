/** One seeded emission factor, flattened out of `methodologies.json`. */
export interface SeededFactor {
  /** Identifies the subcategory; factors only collide within one. */
  subcategory: string;
  dimensionValue1: string | null;
  dimensionValue2: string | null;
  rateMeasurementUnitAbbreviation: string;
  source: string;
  year: number;
}

/** Magnitude codes of a rate unit's numerator and denominator. */
export interface RateUnitMagnitudes {
  numerator: string;
  denominator: string;
}

export interface ConversionCollision {
  first: SeededFactor;
  second: SeededFactor;
}

/**
 * Capture offers a factor with a NULL dimension for any value of that
 * dimension (`getAvailableFactors` in the web's `emissionFactorService.ts`).
 */
const dimensionsMatch = (a: string | null, b: string | null): boolean =>
  a === null || b === null || a === b;

/**
 * Finds the pairs of factors that capture would offer as two candidates for
 * one declaration.
 *
 * `getCarbonInventoryMethodology` derives every factor into every rate unit
 * with the same numerator and denominator magnitudes, so a factor seeded in
 * `kg/ton` and its twin in `kg/kg` each produce a copy of the other, and the
 * web then refuses to pick either. Two factors collide when they share
 * subcategory, source, year and both magnitudes, and match on both
 * dimensions. Factors in different magnitudes (`kg/L` and `kg/kWh` for one
 * fuel) never collide.
 */
export const findConversionCollisions = (
  factors: SeededFactor[],
  magnitudesByRateUnit: ReadonlyMap<string, RateUnitMagnitudes>
): ConversionCollision[] => {
  const partitions = new Map<string, SeededFactor[]>();
  for (const factor of factors) {
    const magnitudes = magnitudesByRateUnit.get(
      factor.rateMeasurementUnitAbbreviation
    );
    if (!magnitudes) {
      throw new Error(
        `Unknown rate measurement unit '${factor.rateMeasurementUnitAbbreviation}' in ${factor.subcategory}`
      );
    }
    const key = JSON.stringify([
      factor.subcategory,
      factor.source,
      factor.year,
      magnitudes.numerator,
      magnitudes.denominator,
    ]);
    const partition = partitions.get(key);
    if (partition) partition.push(factor);
    else partitions.set(key, [factor]);
  }

  const collisions: ConversionCollision[] = [];
  for (const partition of partitions.values()) {
    partition.forEach((first, index) => {
      for (const second of partition.slice(index + 1)) {
        if (
          dimensionsMatch(first.dimensionValue1, second.dimensionValue1) &&
          dimensionsMatch(first.dimensionValue2, second.dimensionValue2)
        ) {
          collisions.push({ first, second });
        }
      }
    });
  }
  return collisions;
};

const describeDimensions = (factor: SeededFactor): string =>
  [factor.dimensionValue1, factor.dimensionValue2]
    .map((value) => value ?? "(any)")
    .join(" / ");

/** Names a collision by subcategory, dimension values, source, year and rate units. */
export const describeConversionCollision = ({
  first,
  second,
}: ConversionCollision): string =>
  `${first.subcategory}, ${first.source}, ${first.year}: ` +
  `${describeDimensions(first)} in ${first.rateMeasurementUnitAbbreviation} ` +
  `collides with ${describeDimensions(second)} in ${second.rateMeasurementUnitAbbreviation}`;
