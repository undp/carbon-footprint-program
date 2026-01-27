import { FC } from "react";
import { useWatch } from "react-hook-form";
import { Typography, Tooltip } from "@mui/material";
import { NumericInput } from "@/components";
import { RateMeasurementUnit, EmissionFactorDimension } from "@repo/types";
import { isFactorValueEditable } from "../services/emissionFactorService";
import { useLineValidation } from "../hooks/useLineValidation";

interface EmissionEditorFactorCellProps {
  subcategoryId: string;
  lineId: string;
  dimensions: EmissionFactorDimension[];
  rateMeasurementUnits: RateMeasurementUnit[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  }) as string | null;

  const measurementUnitId = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.measurementUnitId`,
  }) as string | null;

  const validation = useLineValidation(subcategoryId, lineId, dimensions);

  const unit = rateMeasurementUnits?.find(
    (rmu) => rmu.denominatorUnit.id === measurementUnitId
  );

  const isEditableBySource = isFactorValueEditable(factorSource);

  const inputElement = isEditableBySource ? (
    <NumericInput
      value={value ?? null}
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
      {value} {unit?.abbreviation ?? ""}
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
