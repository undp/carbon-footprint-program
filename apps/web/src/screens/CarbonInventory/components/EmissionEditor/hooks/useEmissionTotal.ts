import { useMemo } from "react";
import { useFormContext, useWatch, Control } from "react-hook-form";
import { round } from "lodash-es";
import { EmissionCaptureFormValues } from "../../../types/EmissionCaptureTypes";

export const useEmissionTotal = (subcategoryId: string) => {
  const { control } = useFormContext<EmissionCaptureFormValues>();

  const lines =
    useWatch({
      control: control as Control<EmissionCaptureFormValues>,
      name: `subcategories.${subcategoryId}.lines` as const,
    }) || [];

  const totalEmission = useMemo(() => {
    return lines.reduce((acc, row) => {
      const quantity = row.quantity || 0;
      const factorValue = row.factorValue || 0;
      return acc + round(quantity * factorValue, 2);
    }, 0);
  }, [lines]);

  return totalEmission;
};
