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
  onChange: (value: number | null) => void;
  onClick?: () => void;
}

interface EditingNumberFieldProps {
  initialValue: number | null;
  onChange: (value: number | null) => void;
  fieldError?: FieldError;
}

/** Mounts fresh each time the cell enters edit mode, so useState always picks up the latest formValue. */
const EditingNumberField: FC<EditingNumberFieldProps> = ({
  initialValue,
  onChange,
  fieldError,
}) => {
  const [localValue, setLocalValue] = useState<string>(
    initialValue === null ? "" : String(initialValue)
  );

  return (
    <TextField
      fullWidth
      size="small"
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue === "") {
          onChange(null);
          return;
        }
        // An unparseable entry is forwarded as NaN, not folded into null. The
        // empty string is the only input that means null, and for a field where
        // null carries meaning of its own — an emission factor's blank year
        // declares it transversal — silently turning "2o25" into null would
        // store a typo as a deliberate declaration. NaN fails the resolver
        // instead, so the cell shows the error and nothing is saved.
        onChange(Number(localValue));
      }}
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
  const formValue = useWatch({ name: formPath }) as number | null;
  const { errors } = useFormState({ control, name: formPath });
  const fieldError = getNestedError(errors, formArrayName, rowIndex, fieldName);

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
        {Number.isFinite(formValue) ? formValue : ""}
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
