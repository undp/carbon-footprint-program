import { FC } from "react";
import { useWatch, useFormState, useFormContext } from "react-hook-form";
import { MenuItem, Select, Typography, useTheme } from "@mui/material";
import { getNestedError } from "./cellUtils";

interface MagnitudeOption {
  id: string;
  name: string;
}

interface MagnitudeSelectCellProps {
  formArrayName: string;
  rowIndex: number;
  isEditing: boolean;
  options: MagnitudeOption[];
  labelById?: ReadonlyMap<string, string>;
  onChange: (value: string) => void;
  onClick?: () => void;
}

export const MagnitudeSelectCell: FC<MagnitudeSelectCellProps> = ({
  formArrayName,
  rowIndex,
  isEditing,
  options,
  labelById,
  onChange,
  onClick,
}) => {
  const theme = useTheme();
  const formPath = `${formArrayName}.${rowIndex}.magnitudeId`;
  const { control } = useFormContext();
  const magnitudeId = useWatch({ name: formPath }) as string;
  const { errors } = useFormState({ control, name: formPath });
  const fieldError = getNestedError(
    errors,
    formArrayName,
    rowIndex,
    "magnitudeId"
  );

  const optionLabelById = new Map(options.map((m) => [m.id, m.name]));
  const resolveLabel = (id: string): string =>
    labelById?.get(id) ?? optionLabelById.get(id) ?? id;
  const label = magnitudeId ? resolveLabel(magnitudeId) : "";
  const isCurrentInOptions = magnitudeId
    ? options.some((o) => o.id === magnitudeId)
    : true;

  if (!isEditing) {
    return (
      <Typography
        onClick={onClick}
        sx={{
          color: !isCurrentInOptions ? theme.palette.grey[400] : undefined,
          px: 1,
          py: 0.5,
          borderRadius: 1,
          cursor: onClick ? "pointer" : "default",
          transition: "background-color 0.15s ease",
          "&:hover": onClick ? { backgroundColor: "grey.100" } : {},
        }}
      >
        {label}
        {!isCurrentInOptions ? " (Eliminado)" : ""}
      </Typography>
    );
  }

  return (
    <Select
      fullWidth
      size="small"
      value={magnitudeId}
      onChange={(e) => onChange(e.target.value)}
      error={!!fieldError}
      onKeyDown={(e) => e.stopPropagation()}
      sx={{ backgroundColor: "white" }}
      displayEmpty
    >
      {!magnitudeId && (
        <MenuItem value="" disabled>
          Selecciona una magnitud
        </MenuItem>
      )}
      {magnitudeId && !isCurrentInOptions && (
        <MenuItem value={magnitudeId} disabled>
          {label} (Eliminado)
        </MenuItem>
      )}
      {options.map((mag) => (
        <MenuItem key={mag.id} value={mag.id}>
          {mag.name}
        </MenuItem>
      ))}
    </Select>
  );
};
