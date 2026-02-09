const KG_PER_TON = 1000;

/**
 * Converts a value from kilograms to metric tons.
 */
export function kgToTon(valueInKg: number): number {
  return valueInKg / KG_PER_TON;
}

/**
 * Converts a value from metric tons to kilograms.
 */
export function tonToKg(valueInTon: number): number {
  return valueInTon * KG_PER_TON;
}
