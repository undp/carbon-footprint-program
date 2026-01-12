import { FC } from "react";
import { Typography, Tooltip } from "@mui/material";
import { NumericInput } from "@/components";
import { RateMeasurementUnit } from "@repo/types";
import { isFactorValueEditable } from "../services/emissionFactorService";

interface EmissionEditorFactorCellProps {
  value: number | null;
  factorSource: string | null;
  measurementUnitId: string | null;
  rateMeasurementUnits: RateMeasurementUnit[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  disabledReason?: string | null;
}

export const EmissionEditorFactorCell: FC<EmissionEditorFactorCellProps> = ({
  value,
  factorSource,
  measurementUnitId,
  rateMeasurementUnits,
  onChange,
  disabled = false,
  disabledReason = null,
}) => {
  const unit = rateMeasurementUnits?.find(
    (rmu) => rmu.denominatorUnit.id === measurementUnitId
  );

  const isEditableBySource = isFactorValueEditable(factorSource);

  const inputElement = isEditableBySource ? (
    <NumericInput
      value={value}
      suffix={unit?.abbreviation ?? ""}
      onChange={onChange}
      disabled={disabled}
      sx={{
        "& .MuiInputBase-input.Mui-disabled": {
          WebkitTextFillColor: disabled ? "rgba(0, 0, 0, 0.38)" : "inherit",
        },
      }}
    />
  ) : (
    <Typography>
      {value} {unit?.abbreviation ?? ""}
    </Typography>
  );

  if (disabled && disabledReason && isEditableBySource) {
    return (
      <Tooltip title={disabledReason} arrow placement="top">
        <span>{inputElement}</span>
      </Tooltip>
    );
  }

  return inputElement;
};
