import { FC, useState } from "react";
import {
  useWatch,
  useFormState,
  useFormContext,
  type FieldError,
} from "react-hook-form";
import { TextField, Typography } from "@mui/material";
import { getNestedError } from "./cellUtils";

interface EditableNumberCellProps {
  /** Name of the form array (e.g. "emissionFactors") */
  formArrayName?: string;
  rowIndex: number;
  fieldName: string;
  isEditing: boolean;
  onChange: (value: number) => void;
  onClick?: () => void;
}

interface EditingNumberFieldProps {
  initialValue: number;
  onChange: (value: number) => void;
  fieldError?: FieldError;
}

/** Mounts fresh each time the cell enters edit mode, so useState always picks up the latest formValue. */
const EditingNumberField: FC<EditingNumberFieldProps> = ({
  initialValue,
  onChange,
  fieldError,
}) => {
  const [localValue, setLocalValue] = useState<string>(String(initialValue));

  return (
    <TextField
      fullWidth
      size="small"
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => onChange(localValue === "" ? 0 : Number(localValue))}
      onKeyDown={(e) => e.stopPropagation()}
      error={!!fieldError}
      label={fieldError?.message ?? ""}
      inputProps={{ style: { textAlign: "right" } }}
      sx={{
        "& .MuiOutlinedInput-root": { backgroundColor: "white" },
      }}
    />
  );
};

export const EditableNumberCell: FC<EditableNumberCellProps> = ({
  formArrayName = "emissionFactors",
  rowIndex,
  fieldName,
  isEditing,
  onChange,
  onClick,
}) => {
  const formPath = `${formArrayName}.${rowIndex}.${fieldName}`;
  const { control } = useFormContext();
  const formValue = useWatch({ name: formPath }) as number;
  const { errors } = useFormState({ control, name: formPath });
  const fieldError = getNestedError(
    errors as unknown as Record<string, unknown>,
    formArrayName,
    rowIndex,
    fieldName
  );

  if (!isEditing) {
    return (
      <Typography
        variant="body2"
        onClick={onClick}
        sx={{
          px: 1,
          py: 0.5,
          borderRadius: 1,
          cursor: onClick ? "pointer" : "default",
          textAlign: "right",
          width: "100%",
          "&:hover": onClick ? { backgroundColor: "grey.100" } : {},
        }}
      >
        {formValue}
      </Typography>
    );
  }

  return (
    <EditingNumberField
      initialValue={formValue}
      onChange={onChange}
      fieldError={fieldError}
    />
  );
};
