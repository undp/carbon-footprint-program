const KG_PER_TON = 1000;

/**
 * Converts a value from kilograms to metric tons.
 */
export function kgToTon(valueInKg: number): number {
  return valueInKg / KG_PER_TON;
}
