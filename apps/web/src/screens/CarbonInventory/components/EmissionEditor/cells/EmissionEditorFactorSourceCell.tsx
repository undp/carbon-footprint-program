import { FC, useMemo } from "react";
import { useWatch } from "react-hook-form";
import { Select, MenuItem, Tooltip } from "@mui/material";
import {
  getCompatibleRateUnitId,
  getCatalogFactorOptions,
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
  // The selector is keyed on the canonical catalog factor, not on its source
  // text: two vintages of one provider share a source and would otherwise be the
  // same option. `Otro` keeps its place in the same list as the custom-factor
  // escape hatch, and a saved custom line shows it because its factorSource says
  // so rather than because its ID is missing.
  const factorSource = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.factorSource`,
  }) as string | null;

  const baseFactorId = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.baseFactorId`,
  }) as string | null;

  const value =
    factorSource && CUSTOM_FACTOR_SOURCES.includes(factorSource)
      ? factorSource
      : baseFactorId;

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

  const catalogOptions = useMemo(
    () =>
      getCatalogFactorOptions(
        emissionFactors,
        dimensionValue1Id,
        dimensionValue2Id,
        getCompatibleRateUnitId(measurementUnitId, rateMeasurementUnits)
      ),
    [
      emissionFactors,
      rateMeasurementUnits,
      measurementUnitId,
      dimensionValue1Id,
      dimensionValue2Id,
    ]
  );

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
      {catalogOptions.map((option) => (
        <MenuItem key={option.id} value={option.id}>
          {option.label}
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
