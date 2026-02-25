import { useMemo } from "react";
import { InventorySubcategory } from "@repo/types";
import { useMeasurementUnits, useRateMeasurementUnits } from "@/api/query";

interface UseEmissionEditorDataParams {
  subcategory: InventorySubcategory;
}

export const useEmissionEditorData = ({
  subcategory,
}: UseEmissionEditorDataParams) => {
  // Queries - fetch external data
  const { data: measurementUnits } = useMeasurementUnits();
  const { data: rateMeasurementUnits } = useRateMeasurementUnits();

  // Static data from subcategory
  const dimensions = useMemo(
    () => subcategory.dimensions,
    [subcategory.dimensions]
  );

  return {
    measurementUnits,
    rateMeasurementUnits,
    dimensions,
    subcategory,
  };
};
