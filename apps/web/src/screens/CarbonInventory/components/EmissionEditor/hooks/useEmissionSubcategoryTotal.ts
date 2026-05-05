import { useMemo } from "react";
import { useFormContext, useWatch, Control } from "react-hook-form";
import {
  EmissionCaptureFormValues,
  SubcategoryWithLines,
} from "../../../types/EmissionCaptureTypes";

export const useEmissionSubcategoryTotal = (
  subcategoryId: SubcategoryWithLines["id"]
): number => {
  const { control } = useFormContext<EmissionCaptureFormValues>();

  const subcategory = useWatch({
    control: control as Control<EmissionCaptureFormValues>,
    name: `subcategories.${subcategoryId}` as const,
  });

  const totalEmission = useMemo(() => {
    if (!subcategory) return 0;
    const { isTotalManualEmissionsModeActive, lines } = subcategory;

    const filteredLines = Object.values(lines || {}).filter(
      (line) => line && !line.isDeleted
    );

    if (filteredLines.length === 0) return 0;

    if (isTotalManualEmissionsModeActive) {
      const firstLine = filteredLines[0];
      const manualValue = firstLine?.manualTotalEmissions;
      // Explicitly check for null/undefined, allowing 0 as valid value
      return manualValue !== null && manualValue !== undefined
        ? manualValue
        : 0;
    }

    return filteredLines.reduce((acc, row) => {
      // Explicitly check for null/undefined, allowing 0 as valid value
      const quantity =
        row.quantity !== null && row.quantity !== undefined ? row.quantity : 0;
      const factorValue =
        row.factorValue !== null && row.factorValue !== undefined
          ? row.factorValue
          : 0;
      return acc + quantity * factorValue;
    }, 0);
  }, [subcategory]);

  return totalEmission;
};
