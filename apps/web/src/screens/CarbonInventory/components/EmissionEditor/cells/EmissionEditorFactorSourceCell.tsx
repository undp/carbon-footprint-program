import { FC, useMemo } from "react";
import { useWatch } from "react-hook-form";
import { Select, MenuItem, Tooltip } from "@mui/material";
import {
  getCompatibleRateUnitId,
  getAvailableFactors,
  getAvailableSources,
} from "../services/emissionFactorService";
import { useLineValidation } from "../hooks/useLineValidation";
import { CUSTOM_FACTOR_SOURCES } from "@/config/constants";
import {
  MethodologyEmissionFactor,
  MethodologyEmissionFactorDimension,
  RateMeasurementUnit,
} from "../../../types";

interface EmissionEditorFactorSourceCellProps {
  subcategoryId: string;
  lineId: string;
  dimensions: MethodologyEmissionFactorDimension[];
  emissionFactors: MethodologyEmissionFactor[];
  rateMeasurementUnits: RateMeasurementUnit[] | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const EmissionEditorFactorSourceCell: FC<
  EmissionEditorFactorSourceCellProps
> = ({
  subcategoryId,
  lineId,
  dimensions,
  emissionFactors,
  rateMeasurementUnits,
  onChange,
  disabled = false,
}) => {
  const value = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.factorSource`,
  }) as string | null;

  const measurementUnitId = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.measurementUnitId`,
  }) as string | null;

  const dimensionValue1Id = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.dimensionValue1Id`,
  }) as string | null;

  const dimensionValue2Id = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.dimensionValue2Id`,
  }) as string | null;

  const validation = useLineValidation(subcategoryId, lineId, dimensions);

  const availableSources = useMemo(() => {
    // 1. Get compatible rate unit
    const compatibleRateUnitId = getCompatibleRateUnitId(
      measurementUnitId,
      rateMeasurementUnits
    );

    // 2. Get available factors for this context (dimensions + rate unit)
    const availableFactors = getAvailableFactors(
      emissionFactors,
      dimensionValue1Id,
      dimensionValue2Id,
      compatibleRateUnitId
    );

    // 3. Get unique sources
    return getAvailableSources(availableFactors);
  }, [
    emissionFactors,
    rateMeasurementUnits,
    measurementUnitId,
    dimensionValue1Id,
    dimensionValue2Id,
  ]);

  const selectElement = (
    <Select
      id={`factorSource_${lineId}`}
      value={value || ""}
      fullWidth
      size="small"
      disabled={disabled || !validation.canSelectFactorSource}
      onChange={(e) => onChange(e.target.value)}
      inputProps={{ autoComplete: "off" }}
      sx={{
        "& .MuiInputBase-input.Mui-disabled": {
          WebkitTextFillColor:
            disabled || !validation.canSelectFactorSource
              ? "rgba(0, 0, 0, 0.38)"
              : "inherit",
        },
      }}
    >
      {availableSources.map((source) => (
        <MenuItem key={source} value={source}>
          {source}
        </MenuItem>
      ))}
      {CUSTOM_FACTOR_SOURCES.map((source) => (
        <MenuItem key={source} value={source}>
          {source}
        </MenuItem>
      ))}
    </Select>
  );

  if (
    (disabled || !validation.canSelectFactorSource) &&
    validation.factorSourceDisabledReason
  ) {
    return (
      <Tooltip
        title={validation.factorSourceDisabledReason}
        arrow
        placement="top"
      >
        <span>{selectElement}</span>
      </Tooltip>
    );
  }

  return selectElement;
};
