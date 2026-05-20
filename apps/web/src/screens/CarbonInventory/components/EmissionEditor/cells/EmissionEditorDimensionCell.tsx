import { FC, useMemo } from "react";
import { useWatch } from "react-hook-form";
import { Select, MenuItem } from "@mui/material";
import { MethodologyEmissionFactorDimension } from "../../../types";

interface EmissionEditorDimensionCellProps {
  subcategoryId: string;
  lineId: string;
  dimension: MethodologyEmissionFactorDimension;
  field: string;
  onChange: (value: string) => void;
  parentField?: string;
  disabled?: boolean;
}

export const EmissionEditorDimensionCell: FC<
  EmissionEditorDimensionCellProps
> = ({
  subcategoryId,
  lineId,
  dimension,
  field,
  onChange,
  parentField,
  disabled = false,
}) => {
  const value = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.${field}`,
  }) as string | null;

  const parentValue = useWatch({
    name: parentField
      ? `subcategories.${subcategoryId}.lines.${lineId}.${parentField}`
      : "",
    disabled: !parentField,
  }) as string | null;

  // Filter values based on parent dimension if provided
  const values = useMemo(() => {
    if (!parentField || !parentValue) return dimension.values;
    return dimension.values.filter(
      (v) => v.parentValueId === parentValue || v.parentValueId === null
    );
  }, [dimension.values, parentValue, parentField]);

  return (
    <Select
      value={value || ""}
      fullWidth
      size="small"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      inputProps={{ autoComplete: "off" }}
    >
      {values.map(({ id, value: dimensionValue }) => (
        <MenuItem key={id} value={id}>
          {dimensionValue}
        </MenuItem>
      ))}
    </Select>
  );
};
