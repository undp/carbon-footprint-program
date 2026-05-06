import { useMemo } from "react";
import { useFormContext, useWatch, Control } from "react-hook-form";
import { EmissionCaptureFormValues } from "../../../types/EmissionCaptureTypes";
import { tonToKg } from "@/utils/number";

export const useEmissionCategoryTotal = (
  categoryId: EmissionCaptureFormValues["subcategories"][number]["categoryId"]
): number => {
  const { control } = useFormContext<EmissionCaptureFormValues>();

  const subcategories = useWatch({
    control: control as Control<EmissionCaptureFormValues>,
    name: `subcategories` as const,
  });

  const totalEmission = useMemo(() => {
    const filteredSubcategories = Object.values(subcategories ?? {}).filter(
      (s) => s.categoryId === categoryId
    );
    if (filteredSubcategories.length === 0) return 0;

    const filteredLines = filteredSubcategories.flatMap((subcategory) =>
      Object.values(subcategory.lines || {}).filter(
        (line) => line && !line.isDeleted
      )
    );

    if (filteredLines.length === 0) return 0;

    return filteredLines.reduce((acc, row) => {
      if (row.isManualTotalEmissions) {
        const manualValue = row?.manualTotalEmissions;
        // Explicitly check for null/undefined, allowing 0 as valid value
        const emissions =
          manualValue !== null && manualValue !== undefined ? manualValue : 0;
        return acc + tonToKg(emissions);
      }

      // Explicitly check for null/undefined, allowing 0 as valid value
      const quantity =
        row.quantity !== null && row.quantity !== undefined ? row.quantity : 0;
      const factorValue =
        row.factorValue !== null && row.factorValue !== undefined
          ? row.factorValue
          : 0;
      return acc + quantity * factorValue;
    }, 0);
  }, [subcategories, categoryId]);

  return totalEmission;
};
