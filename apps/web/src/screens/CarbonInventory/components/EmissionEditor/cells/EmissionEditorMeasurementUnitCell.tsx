import { FC } from "react";
import { Select, MenuItem } from "@mui/material";
import { MeasurementUnit } from "@repo/types";

interface EmissionEditorMeasurementUnitCellProps {
  measurementUnits: MeasurementUnit[];
  value: string | null;
  onChange: (value: string) => void;
  rowId: string | number;
  disabled?: boolean;
}

export const EmissionEditorMeasurementUnitCell: FC<
  EmissionEditorMeasurementUnitCellProps
> = ({ measurementUnits, value, onChange, rowId, disabled = false }) => {
  return (
    <Select
      id={`measurementUnitId_${rowId}`}
      value={value || ""}
      fullWidth
      size="small"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {measurementUnits.map(({ id, name }) => (
        <MenuItem key={name} value={id}>
          {name}
        </MenuItem>
      ))}
    </Select>
  );
};
