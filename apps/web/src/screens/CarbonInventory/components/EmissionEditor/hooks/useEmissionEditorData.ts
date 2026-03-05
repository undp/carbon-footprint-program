import { useMemo } from "react";
import { GetCarbonInventoryMethodologyResponse } from "@repo/types";
import { useMeasurementUnits, useRateMeasurementUnits } from "@/api/query";

type Subcategory =
  GetCarbonInventoryMethodologyResponse["categories"][number]["subcategories"][number];

interface UseEmissionEditorDataParams {
  subcategory: Subcategory;
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
