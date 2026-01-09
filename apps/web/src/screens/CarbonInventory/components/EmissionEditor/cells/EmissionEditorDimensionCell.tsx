import { FC, useMemo } from "react";
import { Select, MenuItem } from "@mui/material";
import { EmissionFactorDimension } from "@repo/types";

interface EmissionEditorDimensionCellProps {
  dimension: EmissionFactorDimension;
  value: string | null;
  onChange: (value: string) => void;
  parentValue?: string | null;
}

export const EmissionEditorDimensionCell: FC<
  EmissionEditorDimensionCellProps
> = ({ dimension, value, onChange, parentValue }) => {
  // Filter values based on parent dimension if provided
  const values = useMemo(() => {
    if (!parentValue) return dimension.values;
    return dimension.values.filter((v) => v.parentValueId === parentValue);
  }, [dimension.values, parentValue]);

  return (
    <Select
      value={value || ""}
      fullWidth
      size="small"
      onChange={(e) => onChange(e.target.value)}
    >
      {values.map(({ id, value: dimensionValue }) => (
        <MenuItem key={id} value={id}>
          {dimensionValue}
        </MenuItem>
      ))}
    </Select>
  );
};
