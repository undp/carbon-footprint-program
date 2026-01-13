import { FC, useMemo } from "react";
import { Select, MenuItem, Tooltip } from "@mui/material";
import {
  CUSTOM_FACTOR_SOURCES,
  getCompatibleRateUnitId,
  getAvailableFactors,
  getAvailableSources,
} from "../services/emissionFactorService";
import {
  EmissionFactor,
  RateMeasurementUnit,
} from "@repo/types";

interface EmissionEditorFactorSourceCellProps {
  emissionFactors: EmissionFactor[];
  rateMeasurementUnits: RateMeasurementUnit[];
  measurementUnitId: string | null;
  dimensionValue1Id: string | null;
  dimensionValue2Id: string | null;
  value: string | null;
  onChange: (value: string) => void;
  rowId: string | number;
  disabled?: boolean;
  disabledReason?: string | null;
}

export const EmissionEditorFactorSourceCell: FC<
  EmissionEditorFactorSourceCellProps
> = ({
  emissionFactors,
  rateMeasurementUnits,
  measurementUnitId,
  dimensionValue1Id,
  dimensionValue2Id,
  value,
  onChange,
  rowId,
  disabled = false,
  disabledReason = null,
}) => {
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
      id={`factorSource_${rowId}`}
      value={value || ""}
      fullWidth
      size="small"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      sx={{
        "& .MuiInputBase-input.Mui-disabled": {
          WebkitTextFillColor: disabled ? "rgba(0, 0, 0, 0.38)" : "inherit",
        },
      }}
    >
      {availableSources.map((source) => (
        <MenuItem key={source} value={source}>
          {source}
        </MenuItem>
      ))}
      <MenuItem value={CUSTOM_FACTOR_SOURCES.OWN_FACTOR}>
        {CUSTOM_FACTOR_SOURCES.OWN_FACTOR}
      </MenuItem>
      <MenuItem value={CUSTOM_FACTOR_SOURCES.OTHER}>
        {CUSTOM_FACTOR_SOURCES.OTHER}
      </MenuItem>
    </Select>
  );

  if (disabled && disabledReason) {
    return (
      <Tooltip title={disabledReason} arrow placement="top">
        <span>{selectElement}</span>
      </Tooltip>
    );
  }

  return selectElement;
};
