import { useMemo } from "react";
import { useFormContext, useWatch, Control } from "react-hook-form";
import { round } from "lodash-es";
import {
  EmissionCaptureFormValues,
  SubcategoryWithLines,
} from "../../../types/EmissionCaptureTypes";

export const useEmissionTotal = (subcategory: SubcategoryWithLines): number => {
  const { control } = useFormContext<EmissionCaptureFormValues>();

  const lines = useWatch({
    control: control as Control<EmissionCaptureFormValues>,
    name: `subcategories.${subcategory.id}.lines` as const,
  });

  const totalEmission = useMemo(() => {
    const linesArray = Object.values(lines || {}).filter(
      (line) => line && !line.isDeleted
    );

    if (linesArray.length === 0) return 0;

    const subcategoryHasEmissionFactors =
      subcategory.emissionFactors.length > 0;
    const isTotalManualEmissionsModeActive =
      subcategory.isTotalManualEmissionsMode || !subcategoryHasEmissionFactors;

    if (isTotalManualEmissionsModeActive) {
      const firstLine = linesArray[0];
      const manualValue = firstLine?.manualTotalEmissions;
      // Explicitly check for null/undefined, allowing 0 as valid value
      return manualValue !== null && manualValue !== undefined
        ? manualValue
        : 0;
    }

    return linesArray.reduce((acc, row) => {
      // Explicitly check for null/undefined, allowing 0 as valid value
      const quantity =
        row.quantity !== null && row.quantity !== undefined ? row.quantity : 0;
      const factorValue =
        row.factorValue !== null && row.factorValue !== undefined
          ? row.factorValue
          : 0;
      return acc + round(quantity * factorValue, 2);
    }, 0);
  }, [subcategory, lines]);

  return totalEmission;
};
