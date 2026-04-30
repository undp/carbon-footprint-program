import { FC } from "react";
import { useWatch } from "react-hook-form";
import { Typography, Tooltip } from "@mui/material";
import { NumericInput } from "@/components";
import { isFactorValueEditable } from "../services/emissionFactorService";
import { useLineValidation } from "../hooks/useLineValidation";
import { formatEmissionFactor } from "@/utils/formatting";
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
  }) as number | null;

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

  const inputElement = isEditableBySource ? (
    <NumericInput
      value={value}
      suffix={unit?.abbreviation ?? ""}
      onChange={onChange}
      disabled={disabled || !validation.canEditFactorValue}
      min={0}
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
    <Typography>
      {value !== null && value !== undefined
        ? formatEmissionFactor(value)
        : value}{" "}
      {unit?.abbreviation ?? ""}
    </Typography>
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
