import { LineWithInputs } from "./mappers.js";

/**
 * Determines if a carbon inventory line has been edited by checking if the active input
 * contains any non-null values. The active input is defined as the first element of
 * line.inputs, as the system maintains inputs in chronological order with the most recent
 * (active) input at index 0.
 */
export const isCarbonInventoryLineEdited = (line: LineWithInputs): boolean => {
  const activeInput = line.inputs?.[0] ?? null;
  return (
    Boolean(activeInput) &&
    (activeInput.selection1Id !== null ||
      activeInput.selection2Id !== null ||
      activeInput.quantity !== null ||
      activeInput.measurementUnitId !== null ||
      activeInput.directTotalEmissions !== null ||
      activeInput.manualFactor !== null ||
      activeInput.manualFactorSource !== null ||
      activeInput.manualFactorRateUnitId !== null ||
      activeInput.comment !== null)
  );
};
