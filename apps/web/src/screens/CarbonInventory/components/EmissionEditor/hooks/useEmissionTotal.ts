import { useMemo } from "react";
import { useFormContext, useWatch, Control } from "react-hook-form";
import { round } from "lodash-es";
import {
  EmissionCaptureFormValues,
  SubcategoryWithLines,
} from "../../../types/EmissionCaptureTypes";

export const useEmissionTotal = (subcategory: SubcategoryWithLines) => {
  const { control } = useFormContext<EmissionCaptureFormValues>();

  const lines = useWatch({
    control: control as Control<EmissionCaptureFormValues>,
    name: `subcategories.${subcategory.id}.lines` as const,
  });

  const totalEmission = useMemo(() => {
    const linesArray = Object.values(lines || {});

    const subcategoryHasEmissionFactors =
      subcategory.emissionFactors.length > 0;
    const isTotalManualEmissionsModeActive =
      subcategory.isTotalManualEmissionsMode || !subcategoryHasEmissionFactors;

    if (isTotalManualEmissionsModeActive) {
      return linesArray[0]?.manualTotalEmissions || 0;
    }

    return linesArray.reduce((acc, row) => {
      const quantity = row.quantity || 0;
      const factorValue = row.factorValue || 0;
      return acc + round(quantity * factorValue, 2);
    }, 0);
  }, [subcategory, lines]);

  return totalEmission;
};
