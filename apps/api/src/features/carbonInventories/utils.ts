import { LineWithInputs } from "./mappers.js";

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
