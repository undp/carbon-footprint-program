import { FC } from "react";
import { useWatch, useFormState, useFormContext } from "react-hook-form";
import { MenuItem, Select, Typography } from "@mui/material";
import { Magnitude } from "@repo/types";
import { MAGNITUDE_LABELS } from "../../screens/MeasurementUnitsScreen/constants.js";
import { getNestedError } from "./cellUtils";

interface MagnitudeSelectCellProps {
  formArrayName: string;
  rowIndex: number;
  isEditing: boolean;
  onChange: (value: Magnitude) => void;
  onClick?: () => void;
}

export const MagnitudeSelectCell: FC<MagnitudeSelectCellProps> = ({
  formArrayName,
  rowIndex,
  isEditing,
  onChange,
  onClick,
}) => {
  const formPath = `${formArrayName}.${rowIndex}.magnitude`;
  const { control } = useFormContext();
  const magnitude = useWatch({ name: formPath }) as Magnitude;
  const { errors } = useFormState({ control, name: formPath });
  const fieldError = getNestedError(
    errors as unknown as Record<string, unknown>,
    formArrayName,
    rowIndex,
    "magnitude"
  );

  const label = MAGNITUDE_LABELS[magnitude] ?? magnitude;

  if (!isEditing) {
    return (
      <Typography
        onClick={onClick}
        sx={{
          px: 1,
          py: 0.5,
          borderRadius: 1,
          cursor: onClick ? "pointer" : "default",
          transition: "background-color 0.15s ease",
          "&:hover": onClick ? { backgroundColor: "grey.100" } : {},
        }}
      >
        {label}
      </Typography>
    );
  }

  return (
    <Select
      fullWidth
      size="small"
      value={magnitude}
      onChange={(e) => onChange(e.target.value as Magnitude)}
      error={!!fieldError}
      onKeyDown={(e) => e.stopPropagation()}
      sx={{ backgroundColor: "white" }}
    >
      {Object.values(Magnitude)
        .sort((a, b) => a.localeCompare(b))
        .map((mag) => (
          <MenuItem key={mag} value={mag}>
            {MAGNITUDE_LABELS[mag]}
          </MenuItem>
        ))}
    </Select>
  );
};
