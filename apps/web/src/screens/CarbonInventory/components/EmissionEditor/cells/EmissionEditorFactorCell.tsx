import { FC } from "react";
import { useWatch } from "react-hook-form";
import { Tooltip } from "@mui/material";
import { DetailTooltipText, NumericInput } from "@/components";
import { isFactorValueEditable } from "../services/emissionFactorService";
import { useLineValidation } from "../hooks/useLineValidation";
import { formatter } from "@/utils/formatting";
import { FACTOR_INPUT_DECIMAL_SCALE } from "@/config/constants";
import {
  MethodologyEmissionFactorDimension,
  RateMeasurementUnit,
} from "../../../types";

interface EmissionEditorFactorCellProps {
  subcategoryId: string;
  lineId: string;
  dimensions: MethodologyEmissionFactorDimension[];
  rateMeasurementUnits: RateMeasurementUnit[] | undefined;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

export const EmissionEditorFactorCell: FC<EmissionEditorFactorCellProps> = ({
  subcategoryId,
  lineId,
  dimensions,
  rateMeasurementUnits,
  onChange,
  disabled = false,
}) => {
  const value = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.factorValue`,
  }) as number | null | undefined;

  const factorSource = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.factorSource`,
  }) as string | null | undefined;

  const measurementUnitId = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.measurementUnitId`,
  }) as string | null | undefined;

  const validation = useLineValidation(subcategoryId, lineId, dimensions);

  const unit = rateMeasurementUnits?.find(
    (rmu) => rmu.denominatorUnit.id === measurementUnitId
  );

  const isEditableBySource = isFactorValueEditable(factorSource);

  // The displayed factor is rounded for legibility; the value behind the
  // emissions the app reports is the one the API delivered.
  const exactValueDetail =
    value == null || Number.isNaN(value)
      ? ""
      : `Valor usado en el cálculo: ${formatter.emissionFactorExact(value)} ${
          unit?.abbreviation ?? ""
        }`.trim();

  const inputElement = isEditableBySource ? (
    <NumericInput
      value={value ?? null}
      suffix={unit?.abbreviation ?? ""}
      onChange={onChange}
      // Own factors accept the full precision the database preserves, so a
      // pasted official factor is never truncated without warning.
      decimalScale={FACTOR_INPUT_DECIMAL_SCALE}
      disabled={disabled || !validation.canEditFactorValue}
      min={0}
      placeholder=""
      sx={{
        "& .MuiInputBase-input.Mui-disabled": {
          WebkitTextFillColor:
            disabled || !validation.canEditFactorValue
              ? "rgba(0, 0, 0, 0.38)"
              : "inherit",
        },
      }}
    />
  ) : (
    <DetailTooltipText detail={exactValueDetail}>
      {formatter.emissionFactor(value, { ifEmpty: " " })}{" "}
      {unit?.abbreviation ?? ""}
    </DetailTooltipText>
  );

  if (
    (disabled || !validation.canEditFactorValue) &&
    validation.factorValueDisabledReason &&
    isEditableBySource
  ) {
    return (
      <Tooltip
        title={validation.factorValueDisabledReason}
        arrow
        placement="top"
      >
        <span>{inputElement}</span>
      </Tooltip>
    );
  }

  return inputElement;
};
