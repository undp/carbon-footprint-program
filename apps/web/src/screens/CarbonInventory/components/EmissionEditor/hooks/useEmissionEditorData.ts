import { useEffect, useMemo } from "react";
import { Subcategory, CarbonInventoryLine } from "@repo/types";
import { round } from "lodash-es";
import { useMeasurementUnits, useRateMeasurementUnits } from "@/api/query";
import { useCarbonInventoryState } from "../../../hooks/useCarbonInventoryState";

interface UseEmissionEditorDataParams {
  subcategory: Subcategory;
  lines: CarbonInventoryLine[];
}

export const useEmissionEditorData = ({
  subcategory,
  lines,
}: UseEmissionEditorDataParams) => {
  // Queries
  const { data: measurementUnits } = useMeasurementUnits();
  const { data: rateMeasurementUnits } = useRateMeasurementUnits();

  // Zustand store selectors
  const subcategoryState = useCarbonInventoryState(
    (state) => state.subcategories[subcategory.id]
  );
  const initializeSubcategory = useCarbonInventoryState(
    (state) => state.initializeSubcategory
  );

  // Initialize subcategory with server data
  useEffect(() => {
    if (!subcategoryState && lines.length > 0) {
      initializeSubcategory(subcategory.id, lines);
    }
  }, [subcategoryState, lines, subcategory.id, initializeSubcategory]);

  // Derived state
  const rows = useMemo(
    () => subcategoryState?.lines || [],
    [subcategoryState?.lines]
  );

  const isTotalManualEmissionsMode =
    subcategoryState?.isTotalManualEmissionsMode || false;

  // Calculate total emissions from rows
  const calculatedTotalEmission = useMemo(() => {
    return rows.reduce((acc, row) => {
      const quantity = row.quantity || 0;
      const factorValue = row.factorValue || 0;
      return acc + round(quantity * factorValue, 2);
    }, 0);
  }, [rows]);

  // Use manual total or calculated total
  const totalEmission = isTotalManualEmissionsMode
    ? subcategoryState?.totalEmission || 0
    : calculatedTotalEmission;

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
