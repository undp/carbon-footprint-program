import { FC, useState } from "react";
import {
  useWatch,
  useFormState,
  useFormContext,
  type FieldError,
} from "react-hook-form";
import { Typography } from "@mui/material";
import { NumericInput } from "@/components";
import { FACTOR_INPUT_DECIMAL_SCALE } from "@/config/constants";
import { formatter } from "@/utils/formatting";
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
  // Committed on blur, so the grid does not re-render on every keystroke.
  const [localValue, setLocalValue] = useState<number | null>(initialValue);

  return (
    <NumericInput
      value={localValue}
      onChange={setLocalValue}
      onBlur={() => onChange(localValue)}
      decimalScale={FACTOR_INPUT_DECIMAL_SCALE}
      placeholder=""
      // Stop every key, not only the arrows, so the DataGrid does not react
      // to Space or Enter while the cell is being edited.
      onKeyDown={(e) => e.stopPropagation()}
      error={!!fieldError}
      label={fieldError?.message ?? ""}
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
        {formatter.exact(formValue, { ifEmpty: "" })}
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
