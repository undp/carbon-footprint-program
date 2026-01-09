import { FC } from "react";
import { Typography } from "@mui/material";
import { NumericInput } from "@/components";
import { RateMeasurementUnit } from "@repo/types";

interface EmissionEditorFactorCellProps {
  value: number | null;
  factorSource: string | null;
  measurementUnitId: string | null;
  rateMeasurementUnits: RateMeasurementUnit[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EmissionEditorFactorCell: FC<EmissionEditorFactorCellProps> = ({
  value,
  factorSource,
  measurementUnitId,
  rateMeasurementUnits,
  onChange,
}) => {
  const unit = rateMeasurementUnits?.find(
    (rmu) => rmu.denominatorUnit.id === measurementUnitId
  );

  const isEditable =
    factorSource === "Factor Propio" || factorSource === "Otro";

  return isEditable ? (
    <NumericInput
      value={value}
      suffix={unit?.abbreviation ?? ""}
      onChange={onChange}
    />
  ) : (
    <Typography>
      {value} {unit?.abbreviation ?? ""}
    </Typography>
  );
};
