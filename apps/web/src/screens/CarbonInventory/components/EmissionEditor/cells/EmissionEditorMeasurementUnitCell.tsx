import { FC } from "react";
import { useWatch } from "react-hook-form";
import { Select, MenuItem } from "@mui/material";
import { MeasurementUnit } from "../../../types";

interface EmissionEditorMeasurementUnitCellProps {
  subcategoryId: string;
  lineId: string;
  measurementUnits: MeasurementUnit[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const EmissionEditorMeasurementUnitCell: FC<
  EmissionEditorMeasurementUnitCellProps
> = ({
  subcategoryId,
  lineId,
  measurementUnits,
  onChange,
  disabled = false,
}) => {
  const value = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.measurementUnitId`,
  }) as string | null;

  return (
    <Select
      id={`measurementUnitId_${lineId}`}
      value={value || ""}
      fullWidth
      size="small"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      inputProps={{ autoComplete: "off" }}
    >
      {measurementUnits.map(({ id, name }) => (
        <MenuItem key={name} value={id}>
          {name}
        </MenuItem>
      ))}
    </Select>
  );
};
