import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Subcategory } from "@repo/types";
import { round } from "lodash-es";
import { useMeasurementUnits, useRateMeasurementUnits } from "@/api/query";
import { EmissionCaptureFormValues } from "../../../types/EmissionCaptureTypes";

interface UseEmissionEditorDataParams {
  subcategory: Subcategory;
}

export const useEmissionEditorData = ({
  subcategory,
}: UseEmissionEditorDataParams) => {
  // Queries
  const { data: measurementUnits } = useMeasurementUnits();
  const { data: rateMeasurementUnits } = useRateMeasurementUnits();

  // Form context
  const { control } = useFormContext<EmissionCaptureFormValues>();

  const subcategoryData = useWatch({
    control,
    name: `subcategories.${subcategory.id}` as const,
  });

  const rows = useMemo(
    () => subcategoryData?.lines || [],
    [subcategoryData?.lines]
  );

  const isTotalManualEmissionsMode = false;

  const totalEmission = useMemo(() => {
    return rows.reduce((acc, row) => {
      const quantity = row.quantity || 0;
      const factorValue = row.factorValue || 0;
      return acc + round(quantity * factorValue, 2);
    }, 0);
  }, [rows]);

  const dimensions = useMemo(
    () => subcategory.dimensions,
    [subcategory.dimensions]
  );

  return {
    rows,
    isTotalManualEmissionsMode,
    totalEmission,
    measurementUnits,
    rateMeasurementUnits,
    dimensions,
    subcategory,
  };
};
